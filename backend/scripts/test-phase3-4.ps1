# Phase 3 & 4 Automated Comprehensive Test Suite
# Tests: Pantry, Recommendations, Shopping Lists, Favorites, Meal Plans, Cooking History, Food Waste
# Run: powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase3-4.ps1

$BASE = "http://localhost:5000/api"
$PASS = 0; $FAIL = 0

function Test-Result {
  param([string]$Name, [bool]$Condition, [string]$Detail = "")
  if ($Condition) {
    Write-Host "  ✅  PASS — $Name" -ForegroundColor Green
    $script:PASS++
  } else {
    Write-Host "  ❌  FAIL — $Name$(if($Detail){ ': '+$Detail })" -ForegroundColor Red
    $script:FAIL++
  }
}

function Invoke-API {
  param([string]$Method, [string]$Url, [string]$BodyJson = $null, [string]$Token = $null)
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  try {
    $params = @{ Uri=$Url; Method=$Method; Headers=$headers; UseBasicParsing=$true; ErrorAction="Stop" }
    if ($BodyJson) { $params["Body"] = $BodyJson }
    $resp = Invoke-WebRequest @params
    $bodyObj = $null
    if ($resp.Content) {
      try { $bodyObj = $resp.Content | ConvertFrom-Json } catch {}
    }
    return @{ ok=$true; status=[int]$resp.StatusCode; body=$bodyObj; raw=$resp.Content }
  } catch {
    $status = 0; $bodyObj = $null; $raw = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        $bodyObj = $raw | ConvertFrom-Json
      } catch {}
    }
    if (-not $bodyObj -and $_.ErrorDetails) {
      try { $bodyObj = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    }
    return @{ ok=$false; status=$status; body=$bodyObj; raw=$raw }
  }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Smart Recipe Pantry — Combined Phase 3 & 4 Test Suite           " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── SETUP: Register two distinct test users (User A and User B) ─────────────────
Write-Host "[ SETUP ] Registering User A and User B"
$RND = Get-Random -Minimum 100000 -Maximum 999999
$EMAIL_A = "p34_userA_$RND@example.com"
$EMAIL_B = "p34_userB_$RND@example.com"

$regA = Invoke-API POST "$BASE/auth/register" -BodyJson "{`"name`":`"User A`",`"email`":`"$EMAIL_A`",`"password`":`"Password123`"}"
$regB = Invoke-API POST "$BASE/auth/register" -BodyJson "{`"name`":`"User B`",`"email`":`"$EMAIL_B`",`"password`":`"Password123`"}"

if (-not $regA.ok -or -not $regB.ok) {
  Write-Host "❌ FATAL: Could not register test users. Aborting." -ForegroundColor Red
  exit 1
}

$TOKEN_A = $regA.body.data.token
$USER_A_ID = $regA.body.data.user.user_id
$TOKEN_B = $regB.body.data.token
$USER_B_ID = $regB.body.data.user.user_id

Write-Host "  ✅ User A registered (ID: $USER_A_ID). User B registered (ID: $USER_B_ID)." -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — PANTRY MANAGEMENT (PHASE 3)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 1: Pantry Management                                    " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T1: Add pantry item
Write-Host "[ T1 ] Add pantry item (User A: 500g Flour, expiry 30 days ahead)"
$expGood = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/pantry" -BodyJson "{`"ingredient_id`": 1, `"quantity`": 500, `"unit`": `"g`", `"expiry_date`": `"$expGood`"}" -Token $TOKEN_A
Test-Result "Pantry item added (201)" ($r.status -eq 201 -and $r.body.success -eq $true)
$PANTRY_ITEM_1 = $r.body.data.item.pantry_item_id

# T2: Add item expiring in 3 days (for expiring test)
Write-Host "[ T2 ] Add pantry item expiring soon (User A: 200ml Milk, expiry 3 days ahead)"
$expSoon = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/pantry" -BodyJson "{`"ingredient_id`": 2, `"quantity`": 200, `"unit`": `"ml`", `"expiry_date`": `"$expSoon`"}" -Token $TOKEN_A
Test-Result "Expiring item added (201)" ($r.status -eq 201)
$PANTRY_ITEM_SOON = $r.body.data.item.pantry_item_id

# T3: Add item already expired 2 days ago (for expired test)
Write-Host "[ T3 ] Add pantry item expired (User A: 100g Sugar, expired 2 days ago)"
$expPast = (Get-Date).AddDays(-2).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/pantry" -BodyJson "{`"ingredient_id`": 4, `"quantity`": 100, `"unit`": `"g`", `"expiry_date`": `"$expPast`"}" -Token $TOKEN_A
Test-Result "Expired item added (201)" ($r.status -eq 201)
$PANTRY_ITEM_EXPIRED = $r.body.data.item.pantry_item_id

# T4: Retrieve user's pantry
Write-Host "[ T4 ] GET /api/pantry (User A)"
$r = Invoke-API GET "$BASE/pantry" -Token $TOKEN_A
Test-Result "Pantry retrieved (200)" ($r.status -eq 200)
Test-Result "Pantry has at least 3 items" ($r.body.data.pantry.Count -ge 3)

# T5: Retrieve single pantry item details
Write-Host "[ T5 ] GET /api/pantry/$PANTRY_ITEM_1 (User A)"
$r = Invoke-API GET "$BASE/pantry/$PANTRY_ITEM_1" -Token $TOKEN_A
Test-Result "Pantry item details retrieved" ($r.status -eq 200 -and $r.body.data.item.quantity -eq 500)

# T6: Update pantry item quantity
Write-Host "[ T6 ] PUT /api/pantry/$PANTRY_ITEM_1 (Update quantity to 600g)"
$r = Invoke-API PUT "$BASE/pantry/$PANTRY_ITEM_1" -BodyJson '{"quantity": 600}' -Token $TOKEN_A
Test-Result "Pantry item updated (200)" ($r.status -eq 200 -and $r.body.data.item.quantity -eq 600)

# T7: GET /api/pantry/expiring
Write-Host "[ T7 ] GET /api/pantry/expiring"
$r = Invoke-API GET "$BASE/pantry/expiring" -Token $TOKEN_A
Test-Result "Expiring items list returned" ($r.status -eq 200 -and $r.body.data.count -ge 1)

# T8: GET /api/pantry/expired
Write-Host "[ T8 ] GET /api/pantry/expired"
$r = Invoke-API GET "$BASE/pantry/expired" -Token $TOKEN_A
Test-Result "Expired items list returned" ($r.status -eq 200 -and $r.body.data.count -ge 1)

# T9: GET /api/pantry/summary
Write-Host "[ T9 ] GET /api/pantry/summary"
$r = Invoke-API GET "$BASE/pantry/summary" -Token $TOKEN_A
Test-Result "Summary has total_items >= 3" ($r.status -eq 200 -and $r.body.data.total_items -ge 3)
Test-Result "Summary has expiring_soon_items >= 1" ($r.body.data.expiring_soon_items -ge 1)
Test-Result "Summary has expired_items >= 1" ($r.body.data.expired_items -ge 1)

# T10: Cross-user access rejected (User B cannot access User A's pantry item)
Write-Host "[ T10 ] Security: User B attempts to access User A's pantry item"
$r = Invoke-API GET "$BASE/pantry/$PANTRY_ITEM_1" -Token $TOKEN_B
Test-Result "Cross-user pantry read rejected (403)" ($r.status -eq 403)

# T11: Cross-user update rejected
Write-Host "[ T11 ] Security: User B attempts to update User A's pantry item"
$r = Invoke-API PUT "$BASE/pantry/$PANTRY_ITEM_1" -BodyJson '{"quantity": 999}' -Token $TOKEN_B
Test-Result "Cross-user pantry update rejected (403)" ($r.status -eq 403)

# T12: Delete pantry item
Write-Host "[ T12 ] DELETE /api/pantry/$PANTRY_ITEM_EXPIRED"
$r = Invoke-API DELETE "$BASE/pantry/$PANTRY_ITEM_EXPIRED" -Token $TOKEN_A
Test-Result "Pantry item deleted (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — SMART RECIPE RECOMMENDATIONS (PHASE 3)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 2: Smart Recipe Recommendations                         " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# User A has: Flour (600g), Milk (200ml).
# Recipe 101 is "Pancakes". Let's check recommendations!
Write-Host "[ T13 ] GET /api/recommendations (User A)"
$r = Invoke-API GET "$BASE/recommendations" -Token $TOKEN_A
Test-Result "Recommendations returned (200)" ($r.status -eq 200)
Test-Result "Recommendations array non-empty" ($r.body.data.recommendations.Count -gt 0)
Test-Result "Sorted by coverage percentage DESC" ($r.body.data.recommendations[0].ingredient_coverage_percentage -ge $r.body.data.recommendations[-1].ingredient_coverage_percentage)

# T14: Check availability for Recipe 101
Write-Host "[ T14 ] GET /api/recommendations/101 (Recipe 101: Pancakes)"
$r = Invoke-API GET "$BASE/recommendations/101" -Token $TOKEN_A
Test-Result "Recipe availability returned (200)" ($r.status -eq 200)
Test-Result "Total required ingredients > 0" ($r.body.data.availability.total_required_ingredients -gt 0)
Test-Result "Coverage percentage is calculated" ($r.body.data.availability.ingredient_coverage_percentage -ne $null)

# T15: Recommendations isolated per user
Write-Host "[ T15 ] Recommendations isolated: User B has empty pantry, coverage should be 0%"
$rB = Invoke-API GET "$BASE/recommendations/101" -Token $TOKEN_B
Test-Result "User B coverage is 0%" ($rB.body.data.availability.ingredient_coverage_percentage -eq 0)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — SHOPPING LISTS (PHASE 4)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 3: Shopping Lists                                       " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T16: Create shopping list
Write-Host "[ T16 ] Create shopping list (User A)"
$r = Invoke-API POST "$BASE/shopping-lists" -BodyJson '{"list_name": "Weekly Groceries"}' -Token $TOKEN_A
Test-Result "Shopping list created (201)" ($r.status -eq 201)
$LIST_ID = $r.body.data.list.list_id

# T17: Retrieve shopping lists
Write-Host "[ T17 ] GET /api/shopping-lists (User A)"
$r = Invoke-API GET "$BASE/shopping-lists" -Token $TOKEN_A
Test-Result "Shopping lists retrieved (200)" ($r.status -eq 200 -and $r.body.data.lists.Count -ge 1)

# T18: Add item to shopping list (Ingredient 3 = Egg, 6 pcs)
Write-Host "[ T18 ] Add item to shopping list"
$r = Invoke-API POST "$BASE/shopping-lists/$LIST_ID/items" -BodyJson '{"ingredient_id": 3, "quantity": 6, "unit": "piece"}' -Token $TOKEN_A
Test-Result "Item added to list (201)" ($r.status -eq 201)
$ITEM_ID = $r.body.data.item.list_item_id

# T19: Add same ingredient & unit again (quantity increment test)
Write-Host "[ T19 ] Add same item again to test duplicate handling policy"
$r = Invoke-API POST "$BASE/shopping-lists/$LIST_ID/items" -BodyJson '{"ingredient_id": 3, "quantity": 6, "unit": "piece"}' -Token $TOKEN_A
Test-Result "Quantity incremented to 12" ($r.status -eq 201 -and $r.body.data.item.quantity -eq 12)

# T20: Toggle purchased status
Write-Host "[ T20 ] PATCH /api/shopping-lists/$LIST_ID/items/$ITEM_ID/purchase"
$r = Invoke-API PATCH "$BASE/shopping-lists/$LIST_ID/items/$ITEM_ID/purchase" -Token $TOKEN_A
Test-Result "Item purchased toggled to true" ($r.status -eq 200 -and $r.body.data.is_purchased -eq $true)

# T21: Generate shopping list items from recipe 101
Write-Host "[ T21 ] Generate missing ingredients from Recipe 101 (Pancakes)"
$r = Invoke-API POST "$BASE/shopping-lists/$LIST_ID/generate-from-recipe/101" -Token $TOKEN_A
Test-Result "Generated missing ingredients (200)" ($r.status -eq 200)

# T22: Verify list contains generated items
Write-Host "[ T22 ] GET /api/shopping-lists/$LIST_ID (Verify items exist)"
$r = Invoke-API GET "$BASE/shopping-lists/$LIST_ID" -Token $TOKEN_A
Test-Result "Shopping list items verified" ($r.status -eq 200 -and $r.body.data.list.items.Count -gt 1)

# T23: Security: User B cannot access User A's shopping list
Write-Host "[ T23 ] Security: User B attempts to access User A's list"
$r = Invoke-API GET "$BASE/shopping-lists/$LIST_ID" -Token $TOKEN_B
Test-Result "Cross-user list access rejected (403)" ($r.status -eq 403)

# T24: Remove single item from shopping list
Write-Host "[ T24 ] DELETE /api/shopping-lists/$LIST_ID/items/$ITEM_ID"
$r = Invoke-API DELETE "$BASE/shopping-lists/$LIST_ID/items/$ITEM_ID" -Token $TOKEN_A
Test-Result "Item removed from list (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — FAVORITES (PHASE 4)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 4: Favorites Management                                 " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T25: Add recipe 101 to favorites
Write-Host "[ T25 ] POST /api/favorites/101 (User A)"
$r = Invoke-API POST "$BASE/favorites/101" -Token $TOKEN_A
Test-Result "Recipe added to favorites (201)" ($r.status -eq 201 -and $r.body.data.is_favorite -eq $true)

# T26: Prevent duplicate favorite
Write-Host "[ T26 ] POST /api/favorites/101 again (Duplicate check)"
$r = Invoke-API POST "$BASE/favorites/101" -Token $TOKEN_A
Test-Result "Duplicate favorite rejected (409)" ($r.status -eq 409)

# T27: Check favorite status
Write-Host "[ T27 ] GET /api/favorites/101/check (User A)"
$r = Invoke-API GET "$BASE/favorites/101/check" -Token $TOKEN_A
Test-Result "Favorite status is true" ($r.status -eq 200 -and $r.body.data.is_favorite -eq $true)

# T28: User B check favorite status (should be false)
Write-Host "[ T28 ] GET /api/favorites/101/check (User B — should be false)"
$rB = Invoke-API GET "$BASE/favorites/101/check" -Token $TOKEN_B
Test-Result "User B favorite status is false" ($rB.status -eq 200 -and $rB.body.data.is_favorite -eq $false)

# T29: Retrieve favorites
Write-Host "[ T29 ] GET /api/favorites (User A)"
$r = Invoke-API GET "$BASE/favorites" -Token $TOKEN_A
Test-Result "Favorites list retrieved (200)" ($r.status -eq 200 -and $r.body.data.count -ge 1)

# T30: Remove from favorites
Write-Host "[ T30 ] DELETE /api/favorites/101 (User A)"
$r = Invoke-API DELETE "$BASE/favorites/101" -Token $TOKEN_A
Test-Result "Recipe removed from favorites (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — MEAL PLANNING (PHASE 4)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 5: Meal Planning                                        " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T31: Create meal plan
Write-Host "[ T31 ] POST /api/meal-plans"
$mStart = (Get-Date).ToString("yyyy-MM-dd")
$mEnd = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/meal-plans" -BodyJson "{`"plan_name`": `"Healthy Week`", `"start_date`": `"$mStart`", `"end_date`": `"$mEnd`"}" -Token $TOKEN_A
Test-Result "Meal plan created (201)" ($r.status -eq 201)
$MEAL_PLAN_ID = $r.body.data.plan.meal_plan_id

# T32: Add planned meal (Recipe 101 on day 2)
Write-Host "[ T32 ] POST /api/meal-plans/$MEAL_PLAN_ID/items (Valid date)"
$mDay2 = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/meal-plans/$MEAL_PLAN_ID/items" -BodyJson "{`"recipe_id`": 101, `"planned_date`": `"$mDay2`", `"meal_type`": `"BREAKFAST`", `"planned_servings`": 2}" -Token $TOKEN_A
Test-Result "Planned meal added (201)" ($r.status -eq 201)
$MEAL_ITEM_ID = $r.body.data.item.meal_item_id

# T33: Reject planned meal outside date range
Write-Host "[ T33 ] POST /api/meal-plans/$MEAL_PLAN_ID/items (Date out of range)"
$mOutOfRange = (Get-Date).AddDays(20).ToString("yyyy-MM-dd")
$r = Invoke-API POST "$BASE/meal-plans/$MEAL_PLAN_ID/items" -BodyJson "{`"recipe_id`": 101, `"planned_date`": `"$mOutOfRange`", `"meal_type`": `"LUNCH`", `"planned_servings`": 2}" -Token $TOKEN_A
Test-Result "Out of range date rejected (400)" ($r.status -eq 400)

# T34: Retrieve meal plan with items
Write-Host "[ T34 ] GET /api/meal-plans/$MEAL_PLAN_ID"
$r = Invoke-API GET "$BASE/meal-plans/$MEAL_PLAN_ID" -Token $TOKEN_A
Test-Result "Meal plan retrieved with items" ($r.status -eq 200 -and $r.body.data.plan.items.Count -ge 1)

# T35: Security: User B cannot access User A's meal plan
Write-Host "[ T35 ] Security: User B attempts to access User A's meal plan"
$r = Invoke-API GET "$BASE/meal-plans/$MEAL_PLAN_ID" -Token $TOKEN_B
Test-Result "Cross-user meal plan access rejected (403)" ($r.status -eq 403)

# T36: Update planned meal status
Write-Host "[ T36 ] PUT /api/meal-plans/$MEAL_PLAN_ID/items/$MEAL_ITEM_ID (Mark COOKED)"
$r = Invoke-API PUT "$BASE/meal-plans/$MEAL_PLAN_ID/items/$MEAL_ITEM_ID" -BodyJson '{"status": "COOKED"}' -Token $TOKEN_A
Test-Result "Planned meal status updated (200)" ($r.status -eq 200 -and $r.body.data.item.status -eq "COOKED")

# T37: Delete planned meal item
Write-Host "[ T37 ] DELETE /api/meal-plans/$MEAL_PLAN_ID/items/$MEAL_ITEM_ID"
$r = Invoke-API DELETE "$BASE/meal-plans/$MEAL_PLAN_ID/items/$MEAL_ITEM_ID" -Token $TOKEN_A
Test-Result "Planned meal item deleted (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — COOKING HISTORY (PHASE 4)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 6: Cooking History                                      " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T38: Record cooked recipe
Write-Host "[ T38 ] POST /api/cooking-history (Record Recipe 101)"
$r = Invoke-API POST "$BASE/cooking-history" -BodyJson '{"recipe_id": 101, "servings_made": 4, "notes": "Turned out delicious!"}' -Token $TOKEN_A
Test-Result "Cooking activity recorded (201)" ($r.status -eq 201)
$HISTORY_ID = $r.body.data.history.history_id

# T39: Retrieve cooking history
Write-Host "[ T39 ] GET /api/cooking-history (User A)"
$r = Invoke-API GET "$BASE/cooking-history" -Token $TOKEN_A
Test-Result "Cooking history retrieved (200)" ($r.status -eq 200 -and $r.body.data.history.Count -ge 1)

# T40: Security: User B cannot access User A's cooking history record
Write-Host "[ T40 ] Security: User B attempts to access User A's cooking entry"
$r = Invoke-API GET "$BASE/cooking-history/$HISTORY_ID" -Token $TOKEN_B
Test-Result "Cross-user cooking history read rejected (403)" ($r.status -eq 403)

# T41: Update cooking history entry
Write-Host "[ T41 ] PUT /api/cooking-history/$HISTORY_ID"
$r = Invoke-API PUT "$BASE/cooking-history/$HISTORY_ID" -BodyJson '{"servings_made": 5, "notes": "Shared with friends"}' -Token $TOKEN_A
Test-Result "Cooking history updated (200)" ($r.status -eq 200 -and $r.body.data.history.servings_made -eq 5)

# T42: Delete cooking history entry
Write-Host "[ T42 ] DELETE /api/cooking-history/$HISTORY_ID"
$r = Invoke-API DELETE "$BASE/cooking-history/$HISTORY_ID" -Token $TOKEN_A
Test-Result "Cooking history entry deleted (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — FOOD WASTE MANAGEMENT (PHASE 4)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 7: Food Waste Management                                " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T43: Record food waste (Ingredient 2 = Milk, 100ml, EXPIRED)
Write-Host "[ T43 ] POST /api/food-waste"
$r = Invoke-API POST "$BASE/food-waste" -BodyJson '{"ingredient_id": 2, "quantity": 100, "unit": "ml", "reason": "EXPIRED", "notes": "Sour milk"}' -Token $TOKEN_A
Test-Result "Food waste recorded (201)" ($r.status -eq 201)
$WASTE_ID = $r.body.data.waste.waste_id

# T44: Retrieve food waste records
Write-Host "[ T44 ] GET /api/food-waste (User A)"
$r = Invoke-API GET "$BASE/food-waste" -Token $TOKEN_A
Test-Result "Food waste records retrieved (200)" ($r.status -eq 200 -and $r.body.data.waste.Count -ge 1)

# T45: GET /api/food-waste/summary
Write-Host "[ T45 ] GET /api/food-waste/summary (User A)"
$r = Invoke-API GET "$BASE/food-waste/summary" -Token $TOKEN_A
Test-Result "Summary returned (200)" ($r.status -eq 200)
Test-Result "Total records >= 1" ($r.body.data.summary.total_records -ge 1)
Test-Result "Waste by unit returned" ($r.body.data.summary.waste_by_unit.Count -ge 1)
Test-Result "Waste by reason returned" ($r.body.data.summary.waste_by_reason.Count -ge 1)

# T46: Security: User B cannot view User A's waste record
Write-Host "[ T46 ] Security: User B attempts to access User A's waste record"
$r = Invoke-API GET "$BASE/food-waste/$WASTE_ID" -Token $TOKEN_B
Test-Result "Cross-user food waste read rejected (403)" ($r.status -eq 403)

# T47: Delete food waste record
Write-Host "[ T47 ] DELETE /api/food-waste/$WASTE_ID"
$r = Invoke-API DELETE "$BASE/food-waste/$WASTE_ID" -Token $TOKEN_A
Test-Result "Food waste record deleted (200)" ($r.status -eq 200)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — REGRESSION TESTS (PHASE 1 & PHASE 2 VERIFICATION)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 8: Regression Tests (Phase 1 & 2 Verification)          " -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T48: Phase 1 Health check
Write-Host "[ T48 ] GET /api/health"
$r = Invoke-API GET "$BASE/health"
Test-Result "Health check OK (200)" ($r.status -eq 200 -and $r.body.database -eq "connected")

# T49: Phase 1 Auth me
Write-Host "[ T49 ] GET /api/auth/me (User A)"
$r = Invoke-API GET "$BASE/auth/me" -Token $TOKEN_A
Test-Result "Auth /me works" ($r.status -eq 200 -and $r.body.data.user.email -eq $EMAIL_A)

# T50: Phase 2 Categories
Write-Host "[ T50 ] GET /api/categories"
$r = Invoke-API GET "$BASE/categories"
Test-Result "Categories API works (200)" ($r.status -eq 200 -and $r.body.data.categories.Count -ge 1)

# T51: Phase 2 Ingredients
Write-Host "[ T51 ] GET /api/ingredients"
$r = Invoke-API GET "$BASE/ingredients"
Test-Result "Ingredients API works (200)" ($r.status -eq 200 -and $r.body.data.ingredients.Count -ge 1)

# T52: Phase 2 Dietary tags
Write-Host "[ T52 ] GET /api/dietary-tags"
$r = Invoke-API GET "$BASE/dietary-tags"
Test-Result "Dietary tags API works (200)" ($r.status -eq 200 -and $r.body.data.dietary_tags.Count -ge 1)

# T53: Phase 2 Recipes list & detail
Write-Host "[ T53 ] GET /api/recipes/101"
$r = Invoke-API GET "$BASE/recipes/101"
Test-Result "Recipe 101 retrieved with ingredients & tags" ($r.status -eq 200 -and $r.body.data.recipe.recipe_name -eq "Pancakes")

# T54: Reject unauthenticated request to protected endpoints
Write-Host "[ T54 ] Unauthenticated request to /api/pantry rejected (401)"
$r = Invoke-API GET "$BASE/pantry"
Test-Result "Unauthenticated request rejected with 401" ($r.status -eq 401)

# ── Summary ───────────────────────────────────────────────────────────────────
$TOTAL = $PASS + $FAIL
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $PASS / $TOTAL tests passed" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
if ($FAIL -eq 0) {
  Write-Host "  🎉 All Phase 3 & 4 backend tests passed successfully!" -ForegroundColor Green
} else {
  Write-Host "  ❌ $FAIL test(s) failed. Check logs above." -ForegroundColor Red
}
Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
