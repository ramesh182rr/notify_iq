package com.notifyiq.modelbenchmark

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Checks the Kotlin tokenizer against Hugging Face `tokenizers` output recorded on the host for
 * the full chat-templated prompt of every synthetic corpus case, and checks decoding against the
 * host reference text for the host's generated ids.
 */
@RunWith(AndroidJUnit4::class)
class QwenTokenizerParityTest {
  @Test
  fun promptIdsAndDecodingMatchHostReference() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val files = checkNotNull(instrumentation.targetContext.getExternalFilesDir(null))
    val tokenizerFile = File(files, "tokenizer.json")
    val corpusFile = File(files, "notification-evaluation.tsv")
    assumeTrue("Copy the pinned tokenizer.json to ${tokenizerFile.absolutePath}", tokenizerFile.canRead())
    assumeTrue("Copy the synthetic corpus to ${corpusFile.absolutePath}", corpusFile.canRead())

    val loadStarted = System.nanoTime()
    val tokenizer = QwenBpeTokenizer.load(tokenizerFile)
    val loadMs = (System.nanoTime() - loadStarted) / 1_000_000L
    val assets = instrumentation.context.assets
    val expectedPrompts = BenchmarkCorpus.referenceIds(assets.open("qwen3-reference/prompt-ids.tsv").reader().readText())
    val cases = BenchmarkCorpus.load(corpusFile)
    assertEquals(cases.size, expectedPrompts.size)

    var mismatches = 0
    val encodeStarted = System.nanoTime()
    for (item in cases) {
      val actual = BenchmarkPrompt.chatIds(tokenizer, item.text)
      if (!actual.contentEquals(expectedPrompts.getValue(item.id))) {
        mismatches++
        println("TOKENIZER_MISMATCH id=${item.id} expected_len=${expectedPrompts.getValue(item.id).size} actual_len=${actual.size}")
      }
    }
    val encodeMs = (System.nanoTime() - encodeStarted) / 1_000_000L

    var decodeMismatches = 0
    val outputs = assets.open("qwen3-reference/host-outputs.tsv").reader().readLines().filter(String::isNotBlank)
    for (line in outputs) {
      val fields = line.split('\t')
      val ids = if (fields[1].isBlank()) IntArray(0) else fields[1].split(' ').map(String::toInt).toIntArray()
      val expected = JSONArray("[${fields[2]}]").getString(0)
      if (tokenizer.decode(ids).trim() != expected) {
        decodeMismatches++
        println("DECODE_MISMATCH id=${fields[0]}")
      }
    }
    println(
      "QWEN_TOKENIZER_PARITY cases=${cases.size} prompt_mismatches=$mismatches decode_cases=${outputs.size} " +
        "decode_mismatches=$decodeMismatches load_ms=$loadMs encode_all_ms=$encodeMs process_hwm_kb=${BenchmarkCorpus.processHighWaterKb()}"
    )
    assertEquals(0, mismatches)
    assertEquals(0, decodeMismatches)
  }
}
