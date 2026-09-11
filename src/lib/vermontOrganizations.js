/**
 * Vermont healthcare organizations — used for the organization
 * autocomplete on the registration page.
 *
 * Sources: VT Dept of Health, Bi-State PCA, VNAs of Vermont,
 *          DLP facility lists, ClearChoiceMD, AFC Urgent Care.
 */

export const VT_ORGANIZATIONS = [
  // ── Hospitals ──────────────────────────────────────────────────────────────
  { name: 'UVM Medical Center',                               city: 'Burlington',        type: 'Hospital' },
  { name: 'Central Vermont Medical Center (CVMC)',            city: 'Berlin',            type: 'Hospital' },
  { name: 'Rutland Regional Medical Center (RRMC)',           city: 'Rutland',           type: 'Hospital' },
  { name: 'Southwestern Vermont Medical Center (SVMC)',       city: 'Bennington',        type: 'Hospital' },
  { name: 'Northwestern Medical Center (NMC)',                city: 'St. Albans',        type: 'Hospital' },
  { name: 'Northeastern Vermont Regional Hospital (NVRH)',    city: 'St. Johnsbury',     type: 'Hospital' },
  { name: 'Copley Hospital',                                  city: 'Morrisville',       type: 'Hospital' },
  { name: 'Gifford Medical Center',                           city: 'Randolph',          type: 'Hospital' },
  { name: 'Grace Cottage Family Health & Hospital',           city: 'Townshend',         type: 'Hospital' },
  { name: 'Brattleboro Memorial Hospital (BMH)',              city: 'Brattleboro',       type: 'Hospital' },
  { name: 'North Country Hospital & Health Center',           city: 'Newport',           type: 'Hospital' },
  { name: 'Porter Medical Center',                            city: 'Middlebury',        type: 'Hospital' },
  { name: 'Springfield Hospital',                             city: 'Springfield',       type: 'Hospital' },
  { name: 'Mt. Ascutney Hospital and Health Center',          city: 'Windsor',           type: 'Hospital' },
  { name: 'Vermont Veterans Home',                            city: 'Bennington',        type: 'Hospital' },

  // ── Community Health Centers / FQHCs ───────────────────────────────────────
  { name: 'Community Health Centers of Burlington',           city: 'Burlington',        type: 'Community Health Center' },
  { name: 'Community Health Centers of Burlington',           city: 'South Burlington',  type: 'Community Health Center' },
  { name: 'Community Health Centers of Burlington',           city: 'Winooski',          type: 'Community Health Center' },
  { name: 'Community Health Centers of Burlington',           city: 'Essex',             type: 'Community Health Center' },
  { name: 'Community Health Centers of Burlington',           city: 'South Hero',        type: 'Community Health Center' },
  { name: 'Community Health Centers of Rutland Region',       city: 'Rutland',           type: 'Community Health Center' },
  { name: 'Community Health Centers of Rutland Region',       city: 'Brandon',           type: 'Community Health Center' },
  { name: 'Community Health Centers of Rutland Region',       city: 'Castleton',         type: 'Community Health Center' },
  { name: 'Battenkill Valley Health Center',                  city: 'Arlington',         type: 'Community Health Center' },
  { name: 'Ammonoosuc Community Health Services',             city: 'Littleton, NH',     type: 'Community Health Center' },
  { name: 'Ammonoosuc Community Health Services',             city: 'Woodsville, NH',    type: 'Community Health Center' },
  { name: 'Gifford Health Care',                              city: 'Randolph',          type: 'Community Health Center' },
  { name: 'Gifford Health Care',                              city: 'Barre',             type: 'Community Health Center' },
  { name: 'Gifford Health Care',                              city: 'Berlin',            type: 'Community Health Center' },
  { name: 'Lamoille Health Partners',                         city: 'Morrisville',       type: 'Community Health Center' },
  { name: 'Lamoille Health Partners',                         city: 'Stowe',             type: 'Community Health Center' },
  { name: 'Little Rivers Health Care',                        city: 'Bradford',          type: 'Community Health Center' },
  { name: 'Little Rivers Health Care',                        city: 'Wells River',       type: 'Community Health Center' },
  { name: 'Mountain Community Health',                        city: 'Bristol',           type: 'Community Health Center' },
  { name: 'Northern Counties Health Care (NCHC)',             city: 'St. Johnsbury',     type: 'Community Health Center' },
  { name: 'Northern Counties Health Care (NCHC)',             city: 'Hardwick',          type: 'Community Health Center' },
  { name: 'Northern Counties Health Care (NCHC)',             city: 'Island Pond',       type: 'Community Health Center' },
  { name: 'Northern Counties Health Care (NCHC)',             city: 'Newport',           type: 'Community Health Center' },
  { name: 'Northern Tier Center for Health',                  city: 'St. Albans',        type: 'Community Health Center' },
  { name: 'Northern Tier Center for Health',                  city: 'Swanton',           type: 'Community Health Center' },
  { name: 'Northern Tier Center for Health',                  city: 'Enosburg Falls',    type: 'Community Health Center' },
  { name: 'Northern Tier Center for Health',                  city: 'Richford',          type: 'Community Health Center' },
  { name: 'North Star Health',                                city: 'Springfield',       type: 'Community Health Center' },
  { name: 'North Star Health',                                city: 'Bellows Falls',     type: 'Community Health Center' },
  { name: 'North Star Health',                                city: 'Ludlow',            type: 'Community Health Center' },
  { name: 'The Health Center',                                city: 'Plainfield',        type: 'Community Health Center' },
  { name: 'Planned Parenthood of Northern New England',       city: 'Burlington',        type: 'Community Health Center' },
  { name: 'Planned Parenthood of Northern New England',       city: 'Rutland',           type: 'Community Health Center' },
  { name: 'Planned Parenthood of Northern New England',       city: 'Barre',             type: 'Community Health Center' },
  { name: 'Planned Parenthood of Northern New England',       city: 'Brattleboro',       type: 'Community Health Center' },

  // ── Primary Care Practices (Hospital-affiliated) ───────────────────────────
  { name: 'UVM Health Network Primary Care',                  city: 'Burlington',        type: 'Primary Care' },
  { name: 'UVM Health Network Primary Care',                  city: 'Colchester',        type: 'Primary Care' },
  { name: 'UVM Health Network Primary Care',                  city: 'Milton',            type: 'Primary Care' },
  { name: 'UVM Health Network Primary Care',                  city: 'Hinesburg',         type: 'Primary Care' },
  { name: 'CVMC Medical Group Primary Care',                  city: 'Berlin',            type: 'Primary Care' },
  { name: 'CVMC Medical Group Primary Care',                  city: 'Barre',             type: 'Primary Care' },
  { name: 'CVMC Medical Group Primary Care',                  city: 'Montpelier',        type: 'Primary Care' },
  { name: 'SVMC Primary Care Practices',                      city: 'Bennington',        type: 'Primary Care' },
  { name: 'SVMC Primary Care Practices',                      city: 'Manchester',        type: 'Primary Care' },
  { name: 'Porter Medical Center Primary Care',               city: 'Middlebury',        type: 'Primary Care' },
  { name: 'Copley Health Primary Care',                       city: 'Morrisville',       type: 'Primary Care' },

  // ── Urgent Care ─────────────────────────────────────────────────────────────
  { name: 'ClearChoiceMD Urgent Care',                        city: 'South Burlington',  type: 'Urgent Care' },
  { name: 'ClearChoiceMD Urgent Care',                        city: 'Williston',         type: 'Urgent Care' },
  { name: 'ClearChoiceMD Urgent Care',                        city: 'Rutland',           type: 'Urgent Care' },
  { name: 'ClearChoiceMD Urgent Care',                        city: 'Brattleboro',       type: 'Urgent Care' },
  { name: 'AFC Urgent Care',                                   city: 'Morrisville',       type: 'Urgent Care' },
  { name: 'UVM Medical Center Urgent Care',                   city: 'Burlington',        type: 'Urgent Care' },
  { name: 'UVM Medical Center Urgent Care',                   city: 'South Burlington',  type: 'Urgent Care' },

  // ── Home Health / VNA ───────────────────────────────────────────────────────
  { name: 'Addison County Home Health & Hospice',             city: 'Middlebury',        type: 'Home Health / VNA' },
  { name: 'Caledonia Home Health Care & Hospice',             city: 'St. Johnsbury',     type: 'Home Health / VNA' },
  { name: 'Central Vermont Home Health & Hospice',            city: 'Barre',             type: 'Home Health / VNA' },
  { name: 'Lamoille Home Health & Hospice',                   city: 'Morrisville',       type: 'Home Health / VNA' },
  { name: 'Orleans Essex VNA & Hospice',                      city: 'Newport',           type: 'Home Health / VNA' },
  { name: 'UVM Health Network Home Health & Hospice',         city: 'Colchester',        type: 'Home Health / VNA' },
  { name: 'VNA & Hospice of the Southwest Region',            city: 'Rutland',           type: 'Home Health / VNA' },
  { name: 'VNA & Hospice of the Southwest Region',            city: 'Bennington',        type: 'Home Health / VNA' },
  { name: 'VNA & Hospice of the Southwest Region',            city: 'St. Albans',        type: 'Home Health / VNA' },
  { name: 'Visiting Nurse & Hospice for VT & NH',             city: 'White River Junction', type: 'Home Health / VNA' },

  // ── Skilled Nursing / Long-Term Care ────────────────────────────────────────
  { name: 'Wake Robin (Linden Nursing Home)',                  city: 'Shelburne',         type: 'Skilled Nursing' },
  { name: 'Birchwood Terrace Rehabilitation & Healthcare',    city: 'Burlington',        type: 'Skilled Nursing' },
  { name: 'Burlington Health & Rehab',                        city: 'Burlington',        type: 'Skilled Nursing' },
  { name: 'Green Mountain Nursing & Rehabilitation',          city: 'Burlington',        type: 'Skilled Nursing' },
  { name: 'Helen Porter Healthcare & Rehab',                  city: 'Middlebury',        type: 'Skilled Nursing' },
  { name: 'Bennington Health & Rehabilitation',               city: 'Bennington',        type: 'Skilled Nursing' },
  { name: 'The Villa at St. Albans',                          city: 'St. Albans',        type: 'Skilled Nursing' },
  { name: 'Pine Heights at Brattleboro',                      city: 'Brattleboro',       type: 'Skilled Nursing' },
  { name: 'Rutland Healthcare & Rehabilitation Center',       city: 'Rutland',           type: 'Skilled Nursing' },
  { name: 'The Pines at Rutland',                             city: 'Rutland',           type: 'Skilled Nursing' },
  { name: 'Mountain View Center Genesis Healthcare',          city: 'Rutland',           type: 'Skilled Nursing' },
  { name: 'Starr Farm Nursing Center',                        city: 'Burlington',        type: 'Skilled Nursing' },
  { name: 'Rowan Court',                                      city: 'Barre',             type: 'Skilled Nursing' },
  { name: 'Heaton Woods',                                     city: 'Montpelier',        type: 'Skilled Nursing' },
  { name: 'Berlin Health & Rehabilitation',                   city: 'Berlin',            type: 'Skilled Nursing' },
  { name: 'Randolph Health & Rehabilitation',                 city: 'Randolph',          type: 'Skilled Nursing' },
  { name: 'Springfield Health & Rehab',                       city: 'Springfield',       type: 'Skilled Nursing' },
  { name: 'Newport Center for Rehabilitation',                city: 'Newport',           type: 'Skilled Nursing' },
  { name: 'St. Johnsbury Health & Rehab',                     city: 'St. Johnsbury',     type: 'Skilled Nursing' },
  { name: 'Morrisville Center for Nursing & Rehab',           city: 'Morrisville',       type: 'Skilled Nursing' },
]

/** All unique facility types */
export const VT_ORG_TYPES = [...new Set(VT_ORGANIZATIONS.map((o) => o.type))]

/**
 * Search organizations by name or city.
 * Returns up to `limit` results (default 8).
 */
export function searchOrganizations(query, limit = 8) {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase().trim()
  return VT_ORGANIZATIONS.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q)
  ).slice(0, limit)
}
