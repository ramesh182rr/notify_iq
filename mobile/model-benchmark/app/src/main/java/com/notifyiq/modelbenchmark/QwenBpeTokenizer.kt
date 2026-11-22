package com.notifyiq.modelbenchmark

import android.util.JsonReader
import android.util.JsonToken
import java.io.File
import java.io.InputStreamReader
import java.text.Normalizer
import java.util.regex.Pattern

/**
 * Benchmark-only byte-level BPE tokenizer for the pinned Qwen3 `tokenizer.json`.
 *
 * It implements the subset the pinned file declares: NFC normalizer, the Qwen2 split regex
 * (isolated), GPT-2 byte-to-unicode mapping, rank-ordered BPE merges, and byte-level decoding.
 * [encodeText] never matches added/special tokens inside text, so untrusted notification text
 * cannot inject chat-control tokens; callers compose special tokens explicitly by id.
 * Parity with Hugging Face `tokenizers` is checked by `QwenTokenizerParityTest`.
 */
class QwenBpeTokenizer private constructor(
  private val vocab: Map<String, Int>,
  private val mergeRanks: Map<String, Int>,
  private val idToToken: Array<String?>,
  private val addedTokens: Map<String, Int>,
) {
  private val byteEncoder: CharArray = bytesToUnicode()
  private val byteDecoder: Map<Char, Int> = byteEncoder.withIndex().associate { (b, c) -> c to b }
  private val cache = HashMap<String, IntArray>()

  fun specialId(content: String): Int = requireNotNull(addedTokens[content]) { "Unknown added token $content" }

  fun encodeText(text: String): IntArray {
    val normalized = Normalizer.normalize(text, Normalizer.Form.NFC)
    val out = ArrayList<Int>()
    val matcher = SPLIT.matcher(normalized)
    while (matcher.find()) {
      val piece = matcher.group()
      if (piece.isEmpty()) continue
      cache.getOrPut(piece) { bpe(piece) }.forEach(out::add)
    }
    return out.toIntArray()
  }

  fun decode(ids: IntArray): String {
    val bytes = java.io.ByteArrayOutputStream()
    for (id in ids) {
      val token = idToToken.getOrNull(id) ?: error("Unknown token id $id")
      if (token in addedTokens) {
        bytes.write(token.toByteArray(Charsets.UTF_8))
      } else {
        for (ch in token) bytes.write(requireNotNull(byteDecoder[ch]) { "Non byte-level char in token $id" })
      }
    }
    return bytes.toString(Charsets.UTF_8.name())
  }

  private fun bpe(piece: String): IntArray {
    val encoded = buildString { piece.toByteArray(Charsets.UTF_8).forEach { append(byteEncoder[it.toInt() and 0xFF]) } }
    vocab[encoded]?.let { return intArrayOf(it) }
    val symbols = encoded.map(Char::toString).toMutableList()
    while (symbols.size > 1) {
      var bestRank = Int.MAX_VALUE
      var bestIndex = -1
      for (i in 0 until symbols.size - 1) {
        val rank = mergeRanks[symbols[i] + MERGE_SEPARATOR + symbols[i + 1]] ?: continue
        if (rank < bestRank) {
          bestRank = rank
          bestIndex = i
        }
      }
      if (bestIndex < 0) break
      val left = symbols[bestIndex]
      val right = symbols[bestIndex + 1]
      val merged = ArrayList<String>(symbols.size)
      var i = 0
      while (i < symbols.size) {
        if (i < symbols.size - 1 && symbols[i] == left && symbols[i + 1] == right) {
          merged += left + right
          i += 2
        } else {
          merged += symbols[i]
          i += 1
        }
      }
      symbols.clear()
      symbols.addAll(merged)
    }
    return IntArray(symbols.size) { requireNotNull(vocab[symbols[it]]) { "Symbol missing from vocab" } }
  }

  companion object {
    private const val MERGE_SEPARATOR = "\u0000"

    // Qwen2 split pattern from the pinned tokenizer.json. `\s`/`\S` are expanded to Unicode
    // White_Space because Java and Android ICU differ on `\s` defaults, while the reference
    // (Onig/Rust) treats it as Unicode whitespace.
    private const val WS = "\\t\\n\\u000B\\f\\r\\u0085\\p{Z}"
    private val SPLIT: Pattern = Pattern.compile(
      "(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}| ?[^$WS\\p{L}\\p{N}]+[\\r\\n]*|[$WS]*[\\r\\n]+|[$WS]+(?![^$WS])|[$WS]+"
    )

    fun load(file: File): QwenBpeTokenizer {
      val vocab = HashMap<String, Int>(160_000)
      val ranks = HashMap<String, Int>(160_000)
      val added = HashMap<String, Int>()
      JsonReader(InputStreamReader(file.inputStream().buffered(1 shl 16), Charsets.UTF_8)).use { reader ->
        reader.beginObject()
        while (reader.hasNext()) {
          when (reader.nextName()) {
            "added_tokens" -> {
              reader.beginArray()
              while (reader.hasNext()) {
                var id = -1
                var content: String? = null
                reader.beginObject()
                while (reader.hasNext()) {
                  when (reader.nextName()) {
                    "id" -> id = reader.nextInt()
                    "content" -> content = reader.nextString()
                    else -> reader.skipValue()
                  }
                }
                reader.endObject()
                added[requireNotNull(content)] = id
              }
              reader.endArray()
            }
            "model" -> {
              reader.beginObject()
              while (reader.hasNext()) {
                when (reader.nextName()) {
                  "type" -> require(reader.nextString() == "BPE") { "Expected BPE model" }
                  "vocab" -> {
                    reader.beginObject()
                    while (reader.hasNext()) vocab[reader.nextName()] = reader.nextInt()
                    reader.endObject()
                  }
                  "merges" -> {
                    reader.beginArray()
                    var rank = 0
                    while (reader.hasNext()) {
                      val key = if (reader.peek() == JsonToken.BEGIN_ARRAY) {
                        reader.beginArray()
                        val a = reader.nextString()
                        val b = reader.nextString()
                        reader.endArray()
                        a + MERGE_SEPARATOR + b
                      } else {
                        val parts = reader.nextString().split(' ', limit = 2)
                        parts[0] + MERGE_SEPARATOR + parts[1]
                      }
                      ranks.putIfAbsent(key, rank++)
                    }
                    reader.endArray()
                  }
                  else -> reader.skipValue()
                }
              }
              reader.endObject()
            }
            else -> reader.skipValue()
          }
        }
        reader.endObject()
      }
      val size = maxOf(vocab.values.maxOrNull() ?: 0, added.values.maxOrNull() ?: 0) + 1
      val idToToken = arrayOfNulls<String>(size)
      vocab.forEach { (token, id) -> idToToken[id] = token }
      added.forEach { (token, id) -> idToToken[id] = token }
      return QwenBpeTokenizer(vocab, ranks, idToToken, added)
    }

    /** GPT-2 byte-to-unicode table used by Hugging Face ByteLevel. */
    private fun bytesToUnicode(): CharArray {
      val printable = (('!'.code..'~'.code) + ('¡'.code..'¬'.code) + ('®'.code..'ÿ'.code)).toSet()
      val table = CharArray(256)
      var extra = 0
      for (b in 0 until 256) {
        table[b] = if (b in printable) b.toChar() else (256 + extra++).toChar()
      }
      return table
    }
  }
}
