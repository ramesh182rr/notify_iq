package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
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
}
