package com.notifyiq

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal data class SavedSearch(
  val id: String,
  val name: String,
  val query: String,
  val packageName: String,
  val category: String,
  val dateRange: String,
  val includeArchived: Boolean,
)

internal object SavedSearchCodec {
  private const val SCHEMA_VERSION = 1
  private const val MAX_SEARCHES = 20
  private val dateRanges = setOf("all", "7days", "today")

  fun parse(source: String): List<SavedSearch> {
    require(source.length <= 32_768) { "Saved searches are too large." }
    val root = JSONObject(source)
    require(root.getInt("schemaVersion") == SCHEMA_VERSION)
    val array = root.getJSONArray("searches")
    require(array.length() <= MAX_SEARCHES)
    val searches = (0 until array.length()).map { parseSearch(array.getJSONObject(it)) }
    require(searches.map(SavedSearch::id).distinct().size == searches.size)
    return searches
  }

  fun emptyJson(): String = JSONObject().put("schemaVersion", SCHEMA_VERSION).put("searches", JSONArray()).toString()

  fun add(source: String, name: String, filtersSource: String): String {
    val searches = parse(source)
    require(searches.size < MAX_SEARCHES) { "The saved-search limit has been reached." }
    val normalizedName = name.trim()
    require(normalizedName.length in 1..40)
    val filters = JSONObject(filtersSource)
    val added = parseSearch(JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("name", normalizedName)
      .put("query", filters.optString("query"))
      .put("packageName", filters.optString("packageName"))
      .put("category", filters.optString("category"))
      .put("dateRange", filters.optString("dateRange", "all"))
      .put("includeArchived", filters.optBoolean("includeArchived")))
    return toJson(searches + added)
  }

  fun remove(source: String, id: String): String = toJson(parse(source).filterNot { it.id == id })

  fun toJson(searches: List<SavedSearch>): String = JSONObject().put("schemaVersion", SCHEMA_VERSION).put("searches", JSONArray().apply {
    searches.forEach { search -> put(JSONObject()
      .put("id", search.id).put("name", search.name).put("query", search.query)
      .put("packageName", search.packageName).put("category", search.category)
      .put("dateRange", search.dateRange).put("includeArchived", search.includeArchived)) }
  }).toString()

  private fun parseSearch(item: JSONObject): SavedSearch {
    val id = item.getString("id")
    val name = item.getString("name").trim()
    val query = item.optString("query").trim()
    val packageName = item.optString("packageName").trim()
    val category = item.optString("category")
    val dateRange = item.optString("dateRange", "all")
    require(id.length in 1..64 && name.length in 1..40)
    require(query.length <= 128 && packageName.length <= 255)
    require(category.isEmpty() || NotificationCategory.fromWireValue(category) != null)
    require(dateRange in dateRanges)
    return SavedSearch(id, name, query, packageName, category, dateRange, item.optBoolean("includeArchived"))
  }
}
