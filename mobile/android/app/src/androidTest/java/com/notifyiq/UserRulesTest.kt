package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UserRulesTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  @Test
  fun evaluatesEnabledRulesInOrderAndPreservesDistinctGroups() {
    val rules = UserRuleCodec.parse("""{"schemaVersion":1,"rules":[
      {"id":"one","name":"Bank","enabled":true,"conditions":{"match":"all","containsText":"ＰＡＹMENT"},"actions":[{"type":"setCategory","value":"finance"},{"type":"save"},{"type":"addGroup","value":"Money"}]},
      {"id":"two","name":"Follow up","enabled":true,"conditions":{"match":"all","category":"other"},"actions":[{"type":"setCategory","value":"personal"},{"type":"addGroup","value":"Money"},{"type":"addGroup","value":"Follow up"}]},
      {"id":"off","name":"Disabled","enabled":false,"conditions":{"match":"all","containsText":"payment"},"actions":[{"type":"markImportant","value":true}]}
    ]}""")

    val result = rules.evaluate(RuleSubject("com.bank", "Payment received", null, null, "other", "normal"))

    assertEquals(listOf("one", "two"), result.matchedRuleIds)
    assertEquals("personal", result.category)
    assertTrue(result.save)
    assertEquals(listOf("Money", "Follow up"), result.groups)
    assertEquals(null, result.important)
  }

  @Test
  fun storedRulesRoundTripAndPreviewFromLocalPreferences() {
    val repository = NotificationRepository(temporaryFolder.newFile("rules.db"))
    val rules = """{"schemaVersion":1,"rules":[{"id":"r1","name":"Travel","enabled":true,"conditions":{"match":"all","appPackage":"com.rail"},"actions":[{"type":"setCategory","value":"travel"},{"type":"includeInDigest","value":true}]}]}"""

    repository.setUserRules(rules)

    assertEquals("travel", repository.getUserRules().let { UserRuleCodec.parse(it).rules.single().actions.filterIsInstance<RuleAction.SetCategory>().single().value })
    val preview = org.json.JSONObject(repository.previewUserRules(rules, """{"packageName":"com.rail","title":"Ticket","category":"other","priority":"normal"}"""))
    assertEquals("travel", preview.getString("category"))
    assertTrue(preview.getBoolean("includeInDigest"))
  }

  @Test
  fun invalidRuleSetIsRejectedWithoutReplacingPreviousPreferences() {
    val repository = NotificationRepository(temporaryFolder.newFile("valid-rules.db"))
    val valid = """{"schemaVersion":1,"rules":[]}"""
    repository.setUserRules(valid)

    val failure = runCatching { repository.setUserRules("""{"schemaVersion":1,"rules":[{"id":"r","name":"bad","enabled":true,"conditions":{"match":"all","containsText":"x"},"actions":[{"type":"dropNotification"}]}]}""") }

    assertTrue(failure.isFailure)
    assertEquals("[]", org.json.JSONObject(repository.getUserRules()).getJSONArray("rules").toString())
  }

  @Test
  fun newCaptureAppliesRulesButUserEditsRemainAuthoritative() {
    val repository = NotificationRepository(temporaryFolder.newFile("capture-rules.db"))
    repository.setUserRules("""{"schemaVersion":1,"rules":[{"id":"money","name":"Money","enabled":true,"conditions":{"match":"all","containsText":"payment"},"actions":[{"type":"setCategory","value":"finance"},{"type":"save"},{"type":"includeInDigest","value":true},{"type":"markImportant","value":true},{"type":"addGroup","value":"money"}]}]}""")
    val item = CapturedNotification(
      NotificationIdentity("com.bank", "event-1"), "Payment received", "Salary", null, 100L, 200L,
    )

    repository.upsert(item)
    val created = repository.notifications(NotificationFilters(category = "finance")).single()
    assertTrue(created.saved)
    assertEquals(true, created.includeInDigest)
    assertEquals(true, created.important)
    assertEquals(listOf("money"), created.ruleGroups)
    assertEquals(listOf("money"), created.matchedRuleIds)
    val effects = org.json.JSONObject(repository.ruleResults(created.id)!!)
    assertEquals(true, effects.getBoolean("includeInDigest"))
    assertEquals(true, effects.getBoolean("important"))
    assertEquals("[\"money\"]", effects.getString("groups"))
    assertEquals("[\"money\"]", effects.getString("matchedRuleIds"))

    repository.setSaved(created.id, false)
    repository.setCategoryOverride(created.id, "personal")
    repository.upsert(item.copy(title = "Payment updated"))
    val updated = repository.notifications(NotificationFilters()).single()
    assertFalse(updated.saved)
    assertEquals("personal", updated.category)
  }

  @Test
  fun explicitReevaluationUpdatesRulesButPreservesManualSaveAndCategoryOverrides() {
    val repository = NotificationRepository(temporaryFolder.newFile("reevaluate.db"))
    val item = CapturedNotification(
      NotificationIdentity("com.bank", "event-reevaluate"), "Payment received", "Salary", null, 100L, System.currentTimeMillis(),
    )
    val ruleSavedItem = item.copy(identity = NotificationIdentity("com.bank", "event-rule-saved"), title = "Payment received again", body = "Salary")
    repository.setUserRules("""{"schemaVersion":1,"rules":[{"id":"money","name":"Money","enabled":true,"conditions":{"match":"all","containsText":"payment"},"actions":[{"type":"setCategory","value":"finance"},{"type":"save"}]}]}""")
    repository.upsert(item)
    repository.upsert(ruleSavedItem)
    val first = repository.notifications(NotificationFilters()).single { it.title == "Payment received" }
    repository.setSaved(first.id, false)
    repository.setCategoryOverride(first.id, "personal")

    repository.setUserRules("""{"schemaVersion":2,"rules":[{"id":"money","name":"Money","enabled":true,"conditions":{"match":"all","containsText":"payment"},"actions":[{"type":"setCategory","value":"travel"},{"type":"includeInDigest","value":true}]}]}""")
    assertEquals(2, repository.reevaluateUserRules())

    val updated = repository.notifications(NotificationFilters())
    val manuallyEdited = updated.single { it.title == "Payment received" }
    val ruleOnly = updated.single { it.title == "Payment received again" }
    assertFalse(manuallyEdited.saved)
    assertEquals("personal", manuallyEdited.category)
    assertEquals(true, manuallyEdited.includeInDigest)
    assertFalse(ruleOnly.saved)
    assertEquals("travel", ruleOnly.category)
  }

  @Test
  fun reminderActionsValidateDelayAndAppearInPreview() {
    val valid = """{"schemaVersion":2,"rules":[{"id":"r","name":"Follow up","enabled":true,"conditions":{"match":"all","containsText":"payment"},"actions":[{"type":"setCategory","value":"finance"},{"type":"createReminder","delayMinutes":60}]}]}"""
    val parsed = UserRuleCodec.parse(valid)
    val preview = org.json.JSONObject(NotificationRepository(temporaryFolder.newFile("reminder.db")).previewUserRules(
      valid, """{"packageName":"com.bank","title":"Payment received","category":"other","priority":"normal"}""",
    ))
    assertEquals(60, parsed.evaluate(RuleSubject("com.bank", "Payment received", null, null, "other", "normal")).reminderAfterMinutes)
    assertEquals(60, preview.getInt("reminderAfterMinutes"))
    assertTrue(runCatching { UserRuleCodec.parse(valid.replace("60", "4")) }.isFailure)
  }
}
