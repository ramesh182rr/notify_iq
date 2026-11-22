package com.notifyiq

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.security.SecureRandom
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Password-encrypted NotifyIQ backup format (".niqbackup").
 *
 * Layout: "NIQX" | version(1) | iterations(int) | salt(16) | iv(12) | AES-256-GCM(gzip(payload)).
 * The header is authenticated as GCM associated data, so tampering or a wrong password fails closed.
 * Key derivation: PBKDF2-HMAC-SHA256, 310,000 iterations (OWASP 2023 guidance for this PRF).
 */
internal object BackupCrypto {
  private val MAGIC = byteArrayOf('N'.code.toByte(), 'I'.code.toByte(), 'Q'.code.toByte(), 'X'.code.toByte())
  private const val VERSION: Byte = 1
  const val ITERATIONS = 310_000
  private const val SALT_BYTES = 16
  private const val IV_BYTES = 12
  private const val TAG_BITS = 128
  const val MIN_PASSWORD_LENGTH = 8

  class WrongPasswordOrDamaged : Exception()
  class NotABackup : Exception()

  fun encrypt(password: CharArray, plain: InputStream, out: OutputStream) {
    val random = SecureRandom()
    val salt = ByteArray(SALT_BYTES).also(random::nextBytes)
    val iv = ByteArray(IV_BYTES).also(random::nextBytes)
    val header = header(ITERATIONS, salt, iv)
    out.write(header)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(Cipher.ENCRYPT_MODE, key(password, salt, ITERATIONS), GCMParameterSpec(TAG_BITS, iv))
      updateAAD(header)
    }
    // Closing the GZIP stream closes the cipher stream, which writes the GCM tag.
    GZIPOutputStream(CipherOutputStream(NonClosingOutputStream(out), cipher)).use { gzip -> plain.copyTo(gzip) }
    out.flush()
  }

  fun decrypt(password: CharArray, encrypted: InputStream, plainOut: OutputStream) {
    val data = DataInputStream(encrypted)
    val magic = ByteArray(4).also { runCatching { data.readFully(it) }.getOrElse { throw NotABackup() } }
    if (!magic.contentEquals(MAGIC)) throw NotABackup()
    val version = data.readByte()
    if (version != VERSION) throw NotABackup()
    val iterations = data.readInt()
    if (iterations < 100_000 || iterations > 5_000_000) throw NotABackup()
    val salt = ByteArray(SALT_BYTES).also(data::readFully)
    val iv = ByteArray(IV_BYTES).also(data::readFully)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(Cipher.DECRYPT_MODE, key(password, salt, iterations), GCMParameterSpec(TAG_BITS, iv))
      updateAAD(header(iterations, salt, iv))
    }
    try {
      GZIPInputStream(CipherInputStream(data, cipher)).use { it.copyTo(plainOut) }
    } catch (error: java.io.IOException) {
      // CipherInputStream surfaces AEAD tag failure (wrong password / modified file) as an IOException.
      throw WrongPasswordOrDamaged()
    }
  }

  private fun header(iterations: Int, salt: ByteArray, iv: ByteArray): ByteArray {
    val bytes = java.io.ByteArrayOutputStream()
    DataOutputStream(bytes).apply { write(MAGIC); writeByte(VERSION.toInt()); writeInt(iterations); write(salt); write(iv); flush() }
    return bytes.toByteArray()
  }

  private fun key(password: CharArray, salt: ByteArray, iterations: Int): SecretKeySpec {
    val spec = PBEKeySpec(password, salt, iterations, 256)
    try {
      val raw = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
      return SecretKeySpec(raw, "AES")
    } finally {
      spec.clearPassword()
    }
  }

  private class NonClosingOutputStream(private val target: OutputStream) : OutputStream() {
    override fun write(b: Int) = target.write(b)
    override fun write(b: ByteArray, off: Int, len: Int) = target.write(b, off, len)
    override fun flush() = target.flush()
    override fun close() = target.flush()
  }
}
