package com.notifyiq.modelbenchmark

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OnnxModelLoadTest {
  @Test
  fun loadsPinnedQ4F16GraphAndReportsRequiredInputs() {
    val app = InstrumentationRegistry.getInstrumentation().targetContext
    val model = File(checkNotNull(app.getExternalFilesDir(null)), MODEL_FILENAME)
    assumeTrue("Copy the pinned ONNX file to ${model.absolutePath}", model.isFile && model.canRead())

    val environment = OrtEnvironment.getEnvironment()
    val options = OrtSession.SessionOptions()
    val start = System.nanoTime()
    environment.createSession(model.absolutePath, options).use { session ->
      val loadMillis = (System.nanoTime() - start) / 1_000_000L
      check(session.inputNames.isNotEmpty()) { "The loaded graph has no inputs." }
      println(
        "ONNX_GRAPH_LOAD runtime=1.29.0 model_sha256=9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91 " +
          "load_ms=$loadMillis input_names=${session.inputNames.sorted().joinToString(",")} " +
          "output_names=${session.outputNames.sorted().joinToString(",")} process_hwm_kb=${processHighWaterKb()}"
      )
    }
    options.close()
  }

  private fun processHighWaterKb(): Long? = runCatching {
    File("/proc/self/status").useLines { lines ->
      lines.first { it.startsWith("VmHWM:") }.substringAfter(':').trim().substringBefore(' ').toLong()
    }
  }.getOrNull()

  companion object { private const val MODEL_FILENAME = "model_q4f16.onnx" }
}
