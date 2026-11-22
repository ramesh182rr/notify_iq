package com.notifyiq.modelbenchmark

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Runs the pinned ONNX Q4F16 Qwen3 decoder over the synthetic corpus with greedy decoding,
 * a 64-token cap, thinking disabled and strict JSON scoring. Raw outputs are written to
 * `onnx-outputs.tsv` in the app's external files directory for audit (synthetic data only).
 */
@RunWith(AndroidJUnit4::class)
class OnnxCorpusBenchmarkTest {
  @Test
  fun runsPinnedOnnxModelOnSyntheticEvaluationCorpus() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val files = checkNotNull(instrumentation.targetContext.getExternalFilesDir(null))
    val model = File(files, "model_q4f16.onnx")
    val tokenizerFile = File(files, "tokenizer.json")
    val corpusFile = File(files, "notification-evaluation.tsv")
    assumeTrue("Copy the pinned ONNX file to ${model.absolutePath}", model.canRead())
    assumeTrue("Copy the pinned tokenizer.json to ${tokenizerFile.absolutePath}", tokenizerFile.canRead())
    assumeTrue("Copy the synthetic corpus to ${corpusFile.absolutePath}", corpusFile.canRead())

    val tokenizer = QwenBpeTokenizer.load(tokenizerFile)
    val cases = BenchmarkCorpus.load(corpusFile)
    val hostOutputs = BenchmarkCorpus.referenceIds(
      instrumentation.context.assets.open("qwen3-reference/host-outputs.tsv").reader().readText()
    )
    val eos = setOf(tokenizer.specialId("<|im_end|>"), tokenizer.specialId("<|endoftext|>"))

    val environment = OrtEnvironment.getEnvironment()
    val options = OrtSession.SessionOptions()
    val loadStarted = System.nanoTime()
    val session = environment.createSession(model.absolutePath, options)
    val loadMs = (System.nanoTime() - loadStarted) / 1_000_000L
    val generator = OnnxQwenGenerator(environment, session, eos)
    val predictions = ArrayList<BenchmarkCorpus.Prediction>()
    val prefill = ArrayList<Long>()
    val decodeTokensPerSecond = ArrayList<Double>()
    var hostMatches = 0
    val audit = StringBuilder("id\tprompt_tokens\tgenerated_tokens\tprefill_ms\tdecode_ms\tmatches_host\traw\n")
    try {
      for (item in cases) {
        val started = System.nanoTime()
        val promptIds = BenchmarkPrompt.chatIds(tokenizer, item.text)
        val generation = generator.generate(promptIds, MAX_NEW_TOKENS)
        val raw = tokenizer.decode(generation.tokens).trim()
        val latencyMs = (System.nanoTime() - started) / 1_000_000L
        val prediction = BenchmarkCorpus.score(item, raw, latencyMs)
        if (!prediction.validJson) println("ONNX_INVALID id=${item.id} raw=${raw.take(200).replace("\n", "\\n")}")
        val matchesHost = hostOutputs[item.id]?.contentEquals(generation.tokens) == true
        if (matchesHost) hostMatches++
        predictions += prediction
        prefill += generation.prefillMs
        // Decode steps after the first token (which is produced by the prefill pass).
        val decodeSteps = generation.tokens.size
        if (decodeSteps > 0 && generation.decodeMs > 0) decodeTokensPerSecond += decodeSteps * 1000.0 / generation.decodeMs
        audit.append("${item.id}\t${generation.promptTokens}\t${generation.tokens.size}\t${generation.prefillMs}\t${generation.decodeMs}\t$matchesHost\t${JSONObject.quote(raw)}\n")
      }
    } finally {
      session.close()
      options.close()
    }
    File(files, "onnx-outputs.tsv").writeText(audit.toString())
    val prefillSorted = prefill.sorted()
    val tps = decodeTokensPerSecond.sorted()
    println(
      "ONNX_BENCHMARK runtime=1.29.0 backend=cpu threads=default cpus=${Runtime.getRuntime().availableProcessors()} " +
        "sdk=${android.os.Build.VERSION.SDK_INT} device=${android.os.Build.MODEL} " +
        "model_sha256=9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91 load_ms=$loadMs " +
        "${BenchmarkCorpus.summary(predictions)} prefill_p50_ms=${BenchmarkCorpus.percentile(prefillSorted, 0.50)} " +
        "prefill_p95_ms=${BenchmarkCorpus.percentile(prefillSorted, 0.95)} " +
        "decode_tok_per_s_p50=${if (tps.isEmpty()) "n/a" else BenchmarkCorpus.format(tps[(tps.size - 1) / 2])} " +
        "host_token_matches=$hostMatches/${cases.size} process_hwm_kb=${BenchmarkCorpus.processHighWaterKb()}"
    )
    assertEquals("All synthetic cases must reach a result", cases.size, predictions.size)
  }

  companion object { private const val MAX_NEW_TOKENS = 64 }
}
