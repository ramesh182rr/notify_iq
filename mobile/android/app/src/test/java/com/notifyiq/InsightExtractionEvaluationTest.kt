package com.notifyiq

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Field-level accuracy of [InsightExtractor] on synthetic labelled notifications.
 *
 * `insight-extraction-dev.tsv` is the tuning set and gates the build. `insight-extraction-holdout.tsv`
 * was written before tuning and is reported only, so its numbers stay an honest estimate.
 */
class InsightExtractionEvaluationTest {
  private val zone = ZoneId.of("Asia/Kolkata")

  private data class Case(
    val id: String, val language: String, val posted: Long, val title: String?, val body: String,
    val amount: String, val currency: String, val direction: String, val merchant: String,
    val action: String, val due: String, val subscription: Boolean,
  )

  private data class Metrics(
    var moneyTp: Int = 0, var moneyFp: Int = 0, var moneyFn: Int = 0, var amountOk: Int = 0, var directionOk: Int = 0,
    var merchantChecked: Int = 0, var merchantOk: Int = 0,
    var actionTp: Int = 0, var actionFp: Int = 0, var actionFn: Int = 0, var kindOk: Int = 0, var dueOk: Int = 0,
    var subscriptionOk: Int = 0, var cases: Int = 0, val errors: MutableList<String> = mutableListOf(),
  ) {
    fun ratio(a: Int, b: Int) = if (b == 0) 1.0 else a.toDouble() / b
    val moneyPrecision get() = ratio(moneyTp, moneyTp + moneyFp)
    val moneyRecall get() = ratio(moneyTp, moneyTp + moneyFn)
    val amountAccuracy get() = ratio(amountOk, moneyTp)
    val directionAccuracy get() = ratio(directionOk, moneyTp)
    val merchantAccuracy get() = ratio(merchantOk, merchantChecked)
    val actionPrecision get() = ratio(actionTp, actionTp + actionFp)
    val actionRecall get() = ratio(actionTp, actionTp + actionFn)
    val kindAccuracy get() = ratio(kindOk, actionTp)
    val dueAccuracy get() = ratio(dueOk, actionTp)
    val subscriptionAccuracy get() = ratio(subscriptionOk, cases)
    fun summary(name: String) = String.format(
      Locale.ROOT,
      "INSIGHT_EVAL %s cases=%d money_p=%.3f money_r=%.3f amount_acc=%.3f direction_acc=%.3f merchant_acc=%.3f(%d) " +
        "action_p=%.3f action_r=%.3f kind_acc=%.3f due_acc=%.3f subscription_acc=%.3f",
      name, cases, moneyPrecision, moneyRecall, amountAccuracy, directionAccuracy, merchantAccuracy, merchantChecked,
      actionPrecision, actionRecall, kindAccuracy, dueAccuracy, subscriptionAccuracy,
    )
  }

  @Test
  fun devSetMeetsAccuracyGate() {
    val metrics = evaluate("insight-extraction-dev.tsv")
    println(metrics.summary("dev"))
    metrics.errors.forEach { println("INSIGHT_MISS dev $it") }
    assertTrue("money precision", metrics.moneyPrecision >= 0.98)
    assertTrue("money recall", metrics.moneyRecall >= 0.95)
    assertTrue("amount accuracy", metrics.amountAccuracy == 1.0)
    assertTrue("direction accuracy", metrics.directionAccuracy >= 0.98)
    assertTrue("merchant accuracy", metrics.merchantAccuracy >= 0.90)
    assertTrue("action precision", metrics.actionPrecision >= 0.95)
    assertTrue("action recall", metrics.actionRecall >= 0.90)
    assertTrue("action kind accuracy", metrics.kindAccuracy >= 0.95)
    assertTrue("due date accuracy", metrics.dueAccuracy >= 0.95)
  }

  @Test
  fun reportHoldoutSet() {
    val metrics = evaluate("insight-extraction-holdout.tsv")
    println(metrics.summary("holdout"))
    metrics.errors.forEach { println("INSIGHT_MISS holdout $it") }
  }

  @Test
  fun reportSecondHoldoutSet() {
    val metrics = evaluate("insight-extraction-holdout2.tsv")
    println(metrics.summary("holdout2"))
    metrics.errors.forEach { println("INSIGHT_MISS holdout2 $it") }
  }

  private fun evaluate(resource: String): Metrics {
    val metrics = Metrics()
    load(resource).forEach { case ->
      metrics.cases++
      val result = InsightExtractor.extract(case.title, case.body, case.posted, zone)
      val money = result.money
      val expectMoney = case.amount != "-"
      when {
        money != null && expectMoney -> {
          metrics.moneyTp++
          val expectedMinor = case.amount.toBigDecimal().movePointRight(2).toLong()
          if (money.amountMinor == expectedMinor && money.currency == case.currency) metrics.amountOk++ else metrics.errors += "${case.id} amount ${money.amountMinor} ${money.currency} expected ${case.amount} ${case.currency}"
          if (money.direction.wire == case.direction) metrics.directionOk++ else metrics.errors += "${case.id} direction ${money.direction.wire}"
          if (case.merchant != "?") {
            metrics.merchantChecked++
            val expected = if (case.merchant == "-") null else norm(case.merchant)
            if (money.merchant?.let(::norm) == expected) metrics.merchantOk++ else metrics.errors += "${case.id} merchant '${money.merchant}' expected '${case.merchant}'"
          }
        }
        money != null -> { metrics.moneyFp++; metrics.errors += "${case.id} unexpected money ${money.amountMinor} ${money.direction.wire}" }
        expectMoney -> { metrics.moneyFn++; metrics.errors += "${case.id} missed money ${case.amount}" }
      }
      val action = result.action
      val expectAction = case.action != "-"
      when {
        action != null && expectAction -> {
          metrics.actionTp++
          if (action.kind.wire == case.action) metrics.kindOk++ else metrics.errors += "${case.id} kind ${action.kind.wire} expected ${case.action}"
          val dueLocal = Instant.ofEpochMilli(action.dueAt).atZone(zone).toLocalDateTime()
          val dueOk = if (case.due.contains('T')) action.hasTime && dueLocal == LocalDateTime.parse(case.due) else dueLocal.toLocalDate().toString() == case.due
          if (dueOk) metrics.dueOk++ else metrics.errors += "${case.id} due $dueLocal hasTime=${action.hasTime} expected ${case.due}"
        }
        action != null -> { metrics.actionFp++; metrics.errors += "${case.id} unexpected action ${action.kind.wire}" }
        expectAction -> { metrics.actionFn++; metrics.errors += "${case.id} missed action ${case.action} ${case.due}" }
      }
      if (result.subscription == case.subscription) metrics.subscriptionOk++ else metrics.errors += "${case.id} subscription ${result.subscription}"
    }
    return metrics
  }

  private fun norm(value: String) = value.lowercase(Locale.ROOT).replace(Regex("\\s+"), " ").trim()

  private fun load(resource: String): List<Case> {
    val stream = checkNotNull(javaClass.classLoader?.getResourceAsStream("notifyiq/$resource")) { "Missing $resource" }
    return stream.bufferedReader(Charsets.UTF_8).readLines().drop(1).filter(String::isNotBlank).map { line ->
      val f = line.split('\t')
      require(f.size == 12) { "Malformed row ${f.firstOrNull()}" }
      Case(
        f[0], f[1], LocalDateTime.parse(f[2]).atZone(zone).toInstant().toEpochMilli(), f[3].takeUnless { it == "-" }, f[4],
        f[5], f[6], f[7], f[8], f[9], f[10], f[11] == "1",
      )
    }
  }
}
