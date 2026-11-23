package com.notifyiq

import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertTrue
import org.junit.Test

/** Category accuracy on synthetic spend and income alerts (`money-category-eval.tsv`). */
class MoneyCategoryEvaluationTest {
  @Test
  fun categoriesMeetAccuracyGate() = evaluate("money-category-eval.tsv", 0.9)

  /** Held-out local merchants (fuel stations, departmental and provision stores, medicals, messes, textiles…). */
  @Test
  fun localMerchantHoldoutMeetsAccuracyGate() = evaluate("money-category-holdout.tsv", 0.9)

  /** Second held-out set, written after the merchant-type layer and not used to tune it. */
  @Test
  fun secondHoldoutMeetsAccuracyGate() = evaluate("money-category-holdout2.tsv", 0.85)

  private fun evaluate(file: String, gate: Double) {
    val stream = checkNotNull(javaClass.classLoader?.getResourceAsStream("notifyiq/$file"))
    val rows = stream.bufferedReader(Charsets.UTF_8).readLines().drop(1).filter(String::isNotBlank).map { it.split('\t') }
    var detected = 0
    var correct = 0
    val misses = mutableListOf<String>()
    rows.forEach { (id, body, expected) ->
      val money = InsightExtractor.extract("Alert", body, 1_795_300_000_000L, ZoneId.of("Asia/Kolkata")).money
      if (money == null) { misses += "$id no money"; return@forEach }
      detected++
      if (money.spendCategory == expected) correct++ else misses += "$id got ${money.spendCategory} expected $expected (merchant=${money.merchant})"
    }
    val accuracy = correct.toDouble() / rows.size
    println(String.format(Locale.ROOT, "MONEY_CATEGORY_EVAL " + file + " cases=%d detected=%d accuracy=%.3f", rows.size, detected, accuracy))
    misses.forEach { println("MONEY_CATEGORY_MISS $it") }
    assertTrue("$file category accuracy $accuracy", accuracy >= gate)
  }
}
