package com.notifyiq.modelbenchmark

import java.io.File
import java.util.Locale
import org.json.JSONObject

/** Synthetic corpus loading and strict scoring shared by ONNX benchmark tests. */
object BenchmarkCorpus {
  data class Case(val id: String, val language: String, val text: String, val category: String, val priority: String)
  data class Prediction(val item: Case, val category: String?, val priority: String?, val latencyMs: Long, val validJson: Boolean)

  val CATEGORIES = listOf("personal", "finance", "delivery_shopping", "travel", "social", "promotion", "reminder_calendar", "system", "other")
  val PRIORITIES = setOf("urgent", "high", "normal", "low")

  fun load(file: File): List<Case> = file.readLines(Charsets.UTF_8).drop(1).filter(String::isNotBlank).map { line ->
    val fields = line.split('\t')
    require(fields.size == 6) { "Malformed synthetic corpus row" }
    Case(fields[0], fields[1], fields[2], fields[3], fields[4])
  }

  /** Strict parse: exactly one JSON object with exactly `category` and `priority`; no repair. */
  fun score(item: Case, raw: String, latencyMs: Long): Prediction = runCatching {
    val json = JSONObject(raw)
    require(json.keys().asSequence().toSet() == setOf("category", "priority"))
    val category = json.getString("category")
    val priority = json.getString("priority")
    require(category in CATEGORIES && priority in PRIORITIES)
    Prediction(item, category, priority, latencyMs, true)
  }.getOrElse { Prediction(item, null, null, latencyMs, false) }

  fun summary(predictions: List<Prediction>): String {
    val n = predictions.size
    val accuracy = predictions.count { it.category == it.item.category }.toDouble() / n
    val macroF1 = CATEGORIES.map { label ->
      val tp = predictions.count { it.category == label && it.item.category == label }
      val fp = predictions.count { it.category == label && it.item.category != label }
      val fn = predictions.count { it.category != label && it.item.category == label }
      val precision = if (tp + fp == 0) 0.0 else tp.toDouble() / (tp + fp)
      val recall = if (tp + fn == 0) 0.0 else tp.toDouble() / (tp + fn)
      if (precision + recall == 0.0) 0.0 else 2 * precision * recall / (precision + recall)
    }.average()
    val priorityAccuracy = predictions.count { it.priority == it.item.priority }.toDouble() / n
    val urgentFp = predictions.count { it.priority == "urgent" && it.item.priority != "urgent" }
    val urgentFn = predictions.count { it.priority != "urgent" && it.item.priority == "urgent" }
    val latencies = predictions.map(Prediction::latencyMs).sorted()
    val languages = predictions.map { it.item.language }.distinct().sorted().joinToString(",") { language ->
      val rows = predictions.filter { it.item.language == language }
      "$language=${format(rows.count { it.category == it.item.category }.toDouble() / rows.size)}"
    }
    return "cases=$n valid_json=${predictions.count { it.validJson }} category_accuracy=${format(accuracy)} " +
      "category_macro_f1=${format(macroF1)} priority_accuracy=${format(priorityAccuracy)} urgent_fp=$urgentFp urgent_fn=$urgentFn " +
      "latency_p50_ms=${percentile(latencies, 0.50)} latency_p95_ms=${percentile(latencies, 0.95)} language_accuracy=[$languages]"
  }

  fun percentile(sorted: List<Long>, p: Double): Long = sorted[((sorted.size - 1) * p).toInt()]
  fun format(value: Double) = String.format(Locale.ROOT, "%.3f", value)

  fun processHighWaterKb(): Long? = runCatching {
    File("/proc/self/status").useLines { lines ->
      lines.first { it.startsWith("VmHWM:") }.substringAfter(':').trim().substringBefore(' ').toLong()
    }
  }.getOrNull()

  /** Reads `id<TAB>space-separated ids[<TAB>...]` reference rows from the test APK assets. */
  fun referenceIds(assetText: String): Map<String, IntArray> = assetText.lineSequence().filter(String::isNotBlank).associate { line ->
    val fields = line.split('\t')
    fields[0] to (if (fields[1].isBlank()) IntArray(0) else fields[1].split(' ').map(String::toInt).toIntArray())
  }
}
