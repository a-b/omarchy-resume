.pragma library

function parsePayload(raw) {
  try {
    var data = JSON.parse(String(raw || ""))
    if (!data || typeof data !== "object") return emptyPayload()
    return {
      schemaVersion: data.schemaVersion || 1,
      defaultAgent: String(data.defaultAgent || ""),
      query: String(data.query || ""),
      cwd: String(data.cwd || ""),
      sources: Array.isArray(data.sources) ? data.sources : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : []
    }
  } catch (e) {
    return emptyPayload()
  }
}

function emptyPayload() {
  return { schemaVersion: 1, defaultAgent: "", query: "", cwd: "", sources: [], sessions: [] }
}

function parseOpenPayload(raw) {
  if (!raw) return { query: "", source: "", cwd: "" }
  try {
    var data = JSON.parse(String(raw))
    if (!data || typeof data !== "object") return { query: "", source: "", cwd: "" }
    return {
      query: String(data.query || ""),
      source: String(data.source || ""),
      cwd: String(data.cwd || "")
    }
  } catch (e) {
    return { query: "", source: "", cwd: "" }
  }
}

var MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function startOfLocalDay(ms) {
  var date = new Date(Number(ms))
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function dayGroup(ms, nowMs) {
  var stamp = Number(ms)
  if (!isFinite(stamp) || stamp <= 0) return "Older"
  var day = startOfLocalDay(stamp)
  var today = startOfLocalDay(nowMs)
  if (day === today) return "Today"
  var yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (day === yesterday.getTime()) return "Yesterday"
  var date = new Date(stamp)
  var now = new Date(Number(nowMs))
  var label = MONTHS[date.getMonth()] + " " + date.getDate()
  if (date.getFullYear() !== now.getFullYear())
    label += ", " + date.getFullYear()
  return label
}

function relativeTime(ms, nowMs) {
  var stamp = Number(ms)
  if (!isFinite(stamp) || stamp <= 0) return ""
  var delta = Math.max(0, Number(nowMs) - stamp)
  var seconds = Math.floor(delta / 1000)
  if (seconds < 45) return "just now"
  var minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + "m ago"
  var hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + "h ago"
  var days = Math.floor(hours / 24)
  if (days < 7) return days + "d ago"
  var weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks + "w ago"
  var date = new Date(stamp)
  return date.toISOString().slice(0, 10)
}

function filterSessions(sessions, query, source) {
  var out = []
  var needles = String(query || "").trim().toLowerCase().split(/\s+/).filter(function(part) { return part.length > 0 })
  for (var i = 0; i < sessions.length; i++) {
    var item = sessions[i]
    if (source && item.source !== source) continue
    if (needles.length === 0) {
      out.push(item)
      continue
    }
    var hay = [item.title, item.snippet, item.project, item.cwd, item.source, item.model, item.id]
      .join(" ").toLowerCase()
    var matched = true
    for (var n = 0; n < needles.length; n++) {
      if (hay.indexOf(needles[n]) === -1) { matched = false; break }
    }
    if (matched) out.push(item)
  }
  return out
}

function sourceRows(sources, sessions, activeSource) {
  var counts = {}
  for (var i = 0; i < sessions.length; i++) {
    var id = sessions[i].source
    counts[id] = (counts[id] || 0) + 1
  }
  var rows = [{
    id: "",
    name: "All",
    mark: "",
    isDefault: false,
    hasAdapter: true,
    count: sessions.length,
    active: !activeSource
  }]
  for (var s = 0; s < sources.length; s++) {
    var source = sources[s]
    if (!source.hasAdapter && !(counts[source.id] > 0)) continue
    rows.push({
      id: source.id,
      name: source.name,
      mark: source.mark || "",
      isDefault: !!source.isDefault,
      hasAdapter: !!source.hasAdapter,
      count: counts[source.id] || 0,
      active: activeSource === source.id
    })
  }
  return rows
}

function handoffTargets(sources, fromSource) {
  var out = []
  var fallback = 0
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i]
    if (!source || !source.canStart) continue
    if (source.id === fromSource) continue
    out.push({
      id: source.id,
      name: source.name,
      mark: source.mark || "",
      isDefault: !!source.isDefault
    })
    if (source.isDefault) fallback = out.length - 1
  }
  return { targets: out, preferred: fallback }
}

function flattenSession(item, nowMs) {
  return {
    sessionId: String(item.id || ""),
    source: String(item.source || ""),
    title: String(item.title || "Untitled session"),
    cwd: String(item.cwd || ""),
    project: String(item.projectLabel || item.project || ""),
    projectKey: String(item.projectKey || item.cwd || ""),
    projectLabel: String(item.projectLabel || item.project || ""),
    modelName: String(item.model || ""),
    snippet: String(item.snippet || ""),
    messageCount: Number(item.messageCount || 0),
    updatedAtMs: Number(item.updatedAtMs || 0),
    updatedLabel: relativeTime(item.updatedAtMs, nowMs),
    dayGroup: dayGroup(item.updatedAtMs, nowMs),
    mark: String(item.mark || "")
  }
}
