package com.notifyiq

import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationEvaluationTest {
  private data class EvaluationCase(
    val id: String,
    val language: String,
    val text: String,
    val category: String,
    val priority: String,
    val phenomenon: String,
  )

  @Test
  fun evaluatesSyntheticMultilingualCorpusAndReportsBaselineMetrics() {
    val input = checkNotNull(javaClass.classLoader?.getResourceAsStream("notifyiq/notification-evaluation.tsv"))
    val cases = input.bufferedReader(Charsets.UTF_8).useLines { lines ->
      lines.drop(1).filter { it.isNotBlank() }.map { line ->
        val fields = line.split('\t')
        assertEquals("Malformed evaluation row: $line", 6, fields.size)
        EvaluationCase(fields[0], fields[1], fields[2], fields[3], fields[4], fields[5])
      }.toList()
    }

    assertEquals(108, cases.size)
    assertEquals(cases.size, cases.map { it.id }.distinct().size)
    assertEquals(setOf("en", "hi", "mix"), cases.map { it.language }.toSet())
    assertTrue(cases.all { it.text.isNotBlank() && it.category in NotificationCategory.entries.map(NotificationCategory::wireValue) })
    assertTrue(cases.map { it.phenomenon }.toSet().containsAll(setOf("ambiguous", "prompt_like", "explicit_urgent", "high", "low")))
    NotificationCategory.entries.forEach { category -> assertEquals(12, cases.count { it.category == category.wireValue }) }

    val predictions = cases.map { case -> case to NotificationAnalyzer.analyze(case.text, null, null) }
    val categoryAccuracy = predictions.count { (case, result) -> case.category == result.category.wireValue }.toDouble() / cases.size
    val categoryMacroF1 = NotificationCategory.entries.map { category ->
      val truePositive = predictions.count { (case, result) -> case.category == category.wireValue && result.category == category }
      val falsePositive = predictions.count { (case, result) -> case.category != category.wireValue && result.category == category }
      val falseNegative = predictions.count { (case, result) -> case.category == category.wireValue && result.category != category }
      val precision = if (truePositive + falsePositive == 0) 0.0 else truePositive.toDouble() / (truePositive + falsePositive)
      val recall = if (truePositive + falseNegative == 0) 0.0 else truePositive.toDouble() / (truePositive + falseNegative)
      if (precision + recall == 0.0) 0.0 else 2.0 * precision * recall / (precision + recall)
    }.average()
    val priorityAccuracy = predictions.count { (case, result) -> case.priority == result.priority }.toDouble() / cases.size
    val urgentFalsePositives = predictions.count { (case, result) -> result.priority == "urgent" && case.priority != "urgent" }
    val urgentFalseNegatives = predictions.count { (case, result) -> result.priority != "urgent" && case.priority == "urgent" }
    val byLanguage = cases.map { it.language }.distinct().sorted().joinToString(" ") { language ->
      val rows = predictions.filter { it.first.language == language }
      val accuracy = rows.count { (case, result) -> case.category == result.category.wireValue }.toDouble() / rows.size
      "$language=${format(accuracy)}"
    }

    println(
      "SYNTHETIC_EVAL cases=${cases.size} " +
        "category_accuracy=${format(categoryAccuracy)} category_macro_f1=${format(categoryMacroF1)} " +
        "priority_accuracy=${format(priorityAccuracy)} urgent_fp=$urgentFalsePositives urgent_fn=$urgentFalseNegatives " +
        "category_accuracy_by_language=[$byLanguage]",
    )
  }

  private fun format(value: Double) = String.format(Locale.ROOT, "%.3f", value)
}
