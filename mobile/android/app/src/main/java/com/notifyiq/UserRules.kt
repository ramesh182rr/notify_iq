package com.notifyiq

import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
import java.util.Locale

internal data class RuleSubject(
  val packageName: String,
  val title: String?,
  val body: String?,
  val subtext: String?,
  val category: String,
  val priority: String,
)

internal data class RuleConditions(
  val appPackage: String? = null,
  val category: String? = null,
  val priority: String? = null,
  val containsText: String? = null,
) {
  fun matches(subject: RuleSubject): Boolean {
    if (appPackage != null && appPackage != subject.packageName) return false
    if (category != null && category != subject.category) return false
    if (priority != null && priority != subject.priority) return false
    if (containsText != null) {
      val needle = normalize(containsText)
      val text = normalize(listOfNotNull(subject.title, subject.body, subject.subtext).joinToString(" "))
      if (!text.contains(needle)) return false
    }
    return true
  }

  companion object {
    private fun normalize(value: String) = Normalizer.normalize(value, Normalizer.Form.NFKC).lowercase(Locale.ROOT)
  }
}

internal sealed interface RuleAction {
  data class SetCategory(val value: String) : RuleAction
  data object Save : RuleAction
  data class IncludeInDigest(val value: Boolean) : RuleAction
  data class MarkImportant(val value: Boolean) : RuleAction
  data class AddGroup(val value: String) : RuleAction
}

internal data class UserRule(
  val id: String,
  val name: String,
  val enabled: Boolean,
  val conditions: RuleConditions,
  val actions: List<RuleAction>,
)

internal data class UserRuleSet(val rules: List<UserRule>) {
  companion object { const val SCHEMA_VERSION = 1 }

  fun evaluate(subject: RuleSubject): RuleEvaluation {
    var category = subject.category
    var saved = false
    var includeInDigest: Boolean? = null
    var important: Boolean? = null
    val groups = linkedSetOf<String>()
    val matched = mutableListOf<String>()
    rules.forEach { rule ->
      if (!rule.enabled || !rule.conditions.matches(subject)) return@forEach
      matched += rule.id
      rule.actions.forEach { action ->
        when (action) {
          is RuleAction.SetCategory -> category = action.value
          RuleAction.Save -> saved = true
          is RuleAction.IncludeInDigest -> includeInDigest = action.value
          is RuleAction.MarkImportant -> important = action.value
          is RuleAction.AddGroup -> groups += action.value
        }
      }
    }
    return RuleEvaluation(matched, category, saved, includeInDigest, important, groups.toList())
  }

  fun toJson(): String = JSONObject().put("schemaVersion", SCHEMA_VERSION).put("rules", JSONArray().apply {
    rules.forEach { rule ->
      put(JSONObject().put("id", rule.id).put("name", rule.name).put("enabled", rule.enabled)
        .put("conditions", JSONObject().put("match", "all").apply {
          rule.conditions.appPackage?.let { put("appPackage", it) }
          rule.conditions.category?.let { put("category", it) }
          rule.conditions.priority?.let { put("priority", it) }
          rule.conditions.containsText?.let { put("containsText", it) }
        }).put("actions", JSONArray().apply { rule.actions.forEach { put(it.toJson()) } }))
    }
  }).toString()
}

internal data class RuleEvaluation(
  val matchedRuleIds: List<String>,
  val category: String,
  val save: Boolean,
  val includeInDigest: Boolean?,
  val important: Boolean?,
  val groups: List<String>,
)

private fun RuleAction.toJson(): JSONObject = when (this) {
  is RuleAction.SetCategory -> JSONObject().put("type", "setCategory").put("value", value)
  RuleAction.Save -> JSONObject().put("type", "save")
  is RuleAction.IncludeInDigest -> JSONObject().put("type", "includeInDigest").put("value", value)
  is RuleAction.MarkImportant -> JSONObject().put("type", "markImportant").put("value", value)
  is RuleAction.AddGroup -> JSONObject().put("type", "addGroup").put("value", value)
}

internal object UserRuleCodec {
  private val categories = setOf("other", "finance", "travel", "delivery_shopping", "reminder_calendar", "social", "promotion", "system", "personal")
  private val priorities = setOf("normal", "high", "urgent")

  fun parse(source: String): UserRuleSet {
    val root = JSONObject(source)
    requireKeys(root, setOf("schemaVersion", "rules"))
    require(root.getInt("schemaVersion") == UserRuleSet.SCHEMA_VERSION) { "Unsupported rule schema version." }
    val array = root.getJSONArray("rules")
    require(array.length() <= 100) { "At most 100 rules are allowed." }
    val ids = mutableSetOf<String>()
    val rules = (0 until array.length()).map { index ->
      val item = array.getJSONObject(index)
      requireKeys(item, setOf("id", "name", "enabled", "conditions", "actions"))
      val id = item.getString("id").trim().also { require(it.isNotEmpty() && it.length <= 80) }
      require(ids.add(id)) { "Rule IDs must be unique." }
      val name = item.getString("name").trim().also { require(it.isNotEmpty() && it.length <= 80) }
      val conditionJson = item.getJSONObject("conditions")
      requireKeys(conditionJson, setOf("match", "appPackage", "category", "priority", "containsText"))
      require(conditionJson.getString("match") == "all") { "Only all-condition matching is supported." }
      val packageName = conditionJson.optionalString("appPackage")?.also { require(it.isNotBlank() && it.length <= 255) }
      val category = conditionJson.optionalString("category")?.also { require(it in categories) }
      val priority = conditionJson.optionalString("priority")?.also { require(it in priorities) }
      val phrase = conditionJson.optionalString("containsText")?.trim()?.also { require(it.isNotEmpty() && it.length <= 120) }
      require(listOf(packageName, category, priority, phrase).count { it != null } in 1..4) { "Provide one or more conditions." }
      val actionArray = item.getJSONArray("actions")
      require(actionArray.length() in 1..5) { "Each rule needs one to five actions." }
      val actions = (0 until actionArray.length()).map { actionIndex -> parseAction(actionArray.getJSONObject(actionIndex)) }
      UserRule(id, name, item.getBoolean("enabled"), RuleConditions(packageName, category, priority, phrase), actions)
    }
    return UserRuleSet(rules)
  }

  private fun parseAction(item: JSONObject): RuleAction {
    val type = item.getString("type")
    return when (type) {
      "save" -> { requireKeys(item, setOf("type")); RuleAction.Save }
      "setCategory" -> { requireKeys(item, setOf("type", "value")); val value = item.getString("value"); require(value in categories); RuleAction.SetCategory(value) }
      "includeInDigest" -> { requireKeys(item, setOf("type", "value")); RuleAction.IncludeInDigest(item.getBoolean("value")) }
      "markImportant" -> { requireKeys(item, setOf("type", "value")); RuleAction.MarkImportant(item.getBoolean("value")) }
      "addGroup" -> { requireKeys(item, setOf("type", "value")); val value = item.getString("value").trim(); require(value.isNotEmpty() && value.length <= 40); RuleAction.AddGroup(value) }
      else -> error("Unsupported rule action: $type")
    }
  }

  private fun JSONObject.optionalString(key: String): String? = if (has(key) && !isNull(key)) getString(key) else null
  private fun requireKeys(value: JSONObject, allowed: Set<String>) {
    val keys = value.keys()
    while (keys.hasNext()) require(keys.next() in allowed) { "Unknown field in user rules." }
  }
}

