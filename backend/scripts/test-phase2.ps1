# Phase 2 — Core Recipe Management Test Suite
# Run: powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase2.ps1
# Requires the backend to be running on port 5000.

$BASE = "http://localhost:5000/api"
$PASS = 0; $FAIL = 0

function Test-Result {
  param([string]$Name, [bool]$Condition, [string]$Detail = "")
  if ($Condition) { Write-Host "  ✅  PASS — $Name" -ForegroundColor Green;  $script:PASS++ }
  else            { Write-Host "  ❌  FAIL — $Name$(if($Detail){ ': '+$Detail })" -ForegroundColor Red; $script:FAIL++ }
}

function Invoke-API {
  param([string]$Method, [string]$Url, [string]$BodyJson = $null, [string]$Token = $null)
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  try {
    $params = @{ Uri=$Url; Method=$Method; Headers=$headers; UseBasicParsing=$true; ErrorAction="Stop" }
    if ($BodyJson) { $params["Body"] = $BodyJson }
    $resp = Invoke-WebRequest @params
    return @{ ok=$true; status=[int]$resp.StatusCode; body=($resp.Content | ConvertFrom-Json) }
  } catch {
    $status = 0; $body = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body   = $reader.ReadToEnd() | ConvertFrom-Json
      } catch {}
    }
    if (-not $body) {
      try { $body = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    }
    return @{ ok=$false; status=$status; body=$body }
  }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Smart Recipe Pantry — Phase 2 Test Suite               " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── SETUP: Get a valid auth token ─────────────────────────────────────────────
Write-Host "[ SETUP ] Authenticating test user"
$RND       = Get-Random -Minimum 10000 -Maximum 99999
$TEST_EMAIL= "p2tester$RND@example.com"
$REG_BODY  = "{`"name`":`"Phase Two`",`"email`":`"$TEST_EMAIL`",`"password`":`"Password123`"}"
$regR = Invoke-API POST "$BASE/auth/register" -BodyJson $REG_BODY
if (-not $regR.ok) { Write-Host "  ❌ FATAL: Could not register test user. Aborting." -ForegroundColor Red; exit 1 }
$TOKEN = $regR.body.data.token
Write-Host "  ✅  Test user registered. Token obtained." -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 1: Categories" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T1 — Get all categories
Write-Host "[ T1  ] GET /api/categories"
$r = Invoke-API GET "$BASE/categories"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "success = true"                 ($r.body.success -eq $true)
Test-Result "categories array present"       ($r.body.data.categories -ne $null)
Test-Result "at least 1 category returned"   ($r.body.data.categories.Count -ge 1)
Test-Result "count field present"            ($r.body.data.count -ge 1)
$CAT1_ID = $r.body.data.categories[0].category_id
Write-Host ""

# T2 — Get category by ID
Write-Host "[ T2  ] GET /api/categories/$CAT1_ID"
$r = Invoke-API GET "$BASE/categories/$CAT1_ID"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "success = true"                 ($r.body.success -eq $true)
Test-Result "category object present"        ($r.body.data.category -ne $null)
Test-Result "correct category_id returned"   ($r.body.data.category.category_id -eq $CAT1_ID)
Write-Host ""

# T3 — Non-existent category
Write-Host "[ T3  ] GET /api/categories/99999 (not found)"
$r = Invoke-API GET "$BASE/categories/99999"
Test-Result "HTTP 404"                       ($r.status -eq 404)
Test-Result "success = false"                ($r.body.success -eq $false)
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — DIETARY TAGS
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 2: Dietary Tags" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T4 — Get all dietary tags
Write-Host "[ T4  ] GET /api/dietary-tags"
$r = Invoke-API GET "$BASE/dietary-tags"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "dietary_tags array"             ($r.body.data.dietary_tags -ne $null)
Test-Result "at least 1 tag returned"        ($r.body.data.dietary_tags.Count -ge 1)
$TAG1_ID = $r.body.data.dietary_tags[0].tag_id
Write-Host ""

# T5 — Get tag by ID
Write-Host "[ T5  ] GET /api/dietary-tags/$TAG1_ID"
$r = Invoke-API GET "$BASE/dietary-tags/$TAG1_ID"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "correct tag_id"                 ($r.body.data.dietary_tag.tag_id -eq $TAG1_ID)
Write-Host ""

# T6 — Non-existent tag
Write-Host "[ T6  ] GET /api/dietary-tags/99999 (not found)"
$r = Invoke-API GET "$BASE/dietary-tags/99999"
Test-Result "HTTP 404"                       ($r.status -eq 404)
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — INGREDIENTS
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 3: Ingredients" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T7 — Get all ingredients (paginated)
Write-Host "[ T7  ] GET /api/ingredients?page=1&limit=5"
$r = Invoke-API GET "$BASE/ingredients?page=1&limit=5"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "ingredients array"              ($r.body.data.ingredients -ne $null)
Test-Result "pagination object"              ($r.body.data.pagination -ne $null)
Test-Result "limit respected (<=5)"          ($r.body.data.ingredients.Count -le 5)
$ING1_ID = $r.body.data.ingredients[0].ingredient_id
Write-Host ""

# T8 — Search ingredients
Write-Host "[ T8  ] GET /api/ingredients/search?q=flour"
$r = Invoke-API GET "$BASE/ingredients/search?q=flour"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "query field returned"           ($r.body.data.query -ne $null)
Test-Result "results array"                  ($r.body.data.ingredients -ne $null)
Test-Result "case-insensitive match"         ($r.body.data.ingredients.Count -ge 1)
Write-Host ""

# T9 — Search missing q param
Write-Host "[ T9  ] GET /api/ingredients/search (no q param)"
$r = Invoke-API GET "$BASE/ingredients/search"
Test-Result "HTTP 400 for missing q"         ($r.status -eq 400)
Write-Host ""

# T10 — Get ingredient by ID
Write-Host "[ T10 ] GET /api/ingredients/$ING1_ID"
$r = Invoke-API GET "$BASE/ingredients/$ING1_ID"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "correct ingredient_id"          ($r.body.data.ingredient.ingredient_id -eq $ING1_ID)
Write-Host ""

# T11 — Create ingredient [protected]
$NEW_ING_NAME = "TestIngredient$RND"
Write-Host "[ T11 ] POST /api/ingredients (create)"
$r = Invoke-API POST "$BASE/ingredients" -BodyJson "{`"ingredient_name`":`"$NEW_ING_NAME`",`"default_unit`":`"g`"}" -Token $TOKEN
Test-Result "HTTP 201"                       ($r.status -eq 201)
Test-Result "ingredient created"             ($r.body.data.ingredient.ingredient_id -gt 0)
Test-Result "correct name"                   ($r.body.data.ingredient.ingredient_name -eq $NEW_ING_NAME)
$NEW_ING_ID = $r.body.data.ingredient.ingredient_id
Write-Host ""

# T12 — Duplicate ingredient name
Write-Host "[ T12 ] POST /api/ingredients (duplicate name)"
$r = Invoke-API POST "$BASE/ingredients" -BodyJson "{`"ingredient_name`":`"$NEW_ING_NAME`",`"default_unit`":`"kg`"}" -Token $TOKEN
Test-Result "HTTP 409 for duplicate"         ($r.status -eq 409)
Write-Host ""

# T13 — Create ingredient without token
Write-Host "[ T13 ] POST /api/ingredients (no auth)"
$r = Invoke-API POST "$BASE/ingredients" -BodyJson "{`"ingredient_name`":`"UnauthedIng`",`"default_unit`":`"g`"}"
Test-Result "HTTP 401 without token"         ($r.status -eq 401)
Write-Host ""

# T14 — Update ingredient
Write-Host "[ T14 ] PUT /api/ingredients/$NEW_ING_ID (update)"
$UPDATED_NAME = "UpdatedIng$RND"
$r = Invoke-API PUT "$BASE/ingredients/$NEW_ING_ID" -BodyJson "{`"ingredient_name`":`"$UPDATED_NAME`",`"default_unit`":`"kg`"}" -Token $TOKEN
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "name updated"                   ($r.body.data.ingredient.ingredient_name -eq $UPDATED_NAME)
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — RECIPES
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SECTION 4: Recipes" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────" -ForegroundColor Yellow

# T15 — Get all recipes (paginated)
Write-Host "[ T15 ] GET /api/recipes?page=1&limit=5"
$r = Invoke-API GET "$BASE/recipes?page=1&limit=5"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "recipes array"                  ($r.body.data.recipes -ne $null)
Test-Result "pagination present"             ($r.body.data.pagination -ne $null)
Test-Result "category embedded"              ($r.body.data.recipes[0].category -ne $null)
Test-Result "ingredients embedded"           ($r.body.data.recipes[0].ingredients -ne $null)
Test-Result "dietary_tags embedded"          ($r.body.data.recipes[0].dietary_tags -ne $null)
Write-Host ""

# T16 — Search recipes
Write-Host "[ T16 ] GET /api/recipes?search=pancake"
$r = Invoke-API GET "$BASE/recipes?search=pancake"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "search results returned"        ($r.body.data.recipes.Count -ge 1)
Write-Host ""

# T17 — Filter by category
Write-Host "[ T17 ] GET /api/recipes?category_id=1"
$r = Invoke-API GET "$BASE/recipes?category_id=1"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "all recipes in cat 1"           ($r.body.data.recipes | ForEach-Object { $_.category.category_id } | Where-Object { $_ -ne 1 } | Measure-Object | Select-Object -ExpandProperty Count) -eq 0
Write-Host ""

# T18 — Filter by difficulty
Write-Host "[ T18 ] GET /api/recipes?difficulty=EASY"
$r = Invoke-API GET "$BASE/recipes?difficulty=EASY"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Write-Host ""

# T19 — Filter by dietary tag
Write-Host "[ T19 ] GET /api/recipes?dietary_tag_id=$TAG1_ID"
$r = Invoke-API GET "$BASE/recipes?dietary_tag_id=$TAG1_ID"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "no duplicate recipes"           ($r.body.data.recipes.Count -eq ($r.body.data.recipes | Select-Object -ExpandProperty recipe_id | Sort-Object -Unique | Measure-Object).Count)
Write-Host ""

# T20 — Get recipe by ID (predefined)
Write-Host "[ T20 ] GET /api/recipes/101 (full detail)"
$r = Invoke-API GET "$BASE/recipes/101"
Test-Result "HTTP 200"                       ($r.status -eq 200)
Test-Result "instructions present"           ($r.body.data.recipe.instructions -ne $null)
Test-Result "category embedded"              ($r.body.data.recipe.category -ne $null)
Test-Result "ingredients embedded"           ($r.body.data.recipe.ingredients -ne $null)
Test-Result "dietary_tags embedded"          ($r.body.data.recipe.dietary_tags -ne $null)
Write-Host ""

# T21 — Get non-existent recipe
Write-Host "[ T21 ] GET /api/recipes/999999 (not found)"
$r = Invoke-API GET "$BASE/recipes/999999"
Test-Result "HTTP 404"                       ($r.status -eq 404)
Write-Host ""

# T22 — Create recipe [protected]
Write-Host "[ T22 ] POST /api/recipes (create with ingredients + tags)"
$CREATE_BODY = @"
{
  "recipe_name": "Test Recipe $RND",
  "description": "A test recipe for Phase 2",
  "category_id": 1,
  "instructions": "Mix all ingredients and cook for 20 minutes.",
  "prep_time": 10,
  "cook_time": 20,
  "difficulty": "EASY",
  "servings": 2,
  "ingredients": [
    { "ingredient_id": 1, "quantity": 200, "unit": "g", "notes": "sifted" },
    { "ingredient_id": 2, "quantity": 100, "unit": "ml", "notes": null }
  ],
  "dietary_tag_ids": [$TAG1_ID]
}
"@
$r = Invoke-API POST "$BASE/recipes" -BodyJson $CREATE_BODY -Token $TOKEN
Test-Result "HTTP 201"                       ($r.status -eq 201)
Test-Result "recipe_id present"              ($r.body.data.recipe.recipe_id -gt 0)
Test-Result "source_type = USER_CREATED"     ($r.body.data.recipe.source_type -eq "USER_CREATED")
Test-Result "ingredients attached (2)"       ($r.body.data.recipe.ingredients.Count -eq 2)
Test-Result "dietary_tags attached (1)"      ($r.body.data.recipe.dietary_tags.Count -eq 1)
Test-Result "user_id from JWT not body"      ($r.body.data.recipe.user_id -ne $null)
$NEW_RECIPE_ID = $r.body.data.recipe.recipe_id
Write-Host ""

# T23 — Create recipe without auth
Write-Host "[ T23 ] POST /api/recipes (no auth)"
$r = Invoke-API POST "$BASE/recipes" -BodyJson $CREATE_BODY
Test-Result "HTTP 401"                       ($r.status -eq 401)
Write-Host ""

# T24 — Create recipe with invalid category
Write-Host "[ T24 ] POST /api/recipes (invalid category_id)"
$BAD_CAT = $CREATE_BODY -replace '"category_id": 1', '"category_id": 99999'
$r = Invoke-API POST "$BASE/recipes" -BodyJson $BAD_CAT -Token $TOKEN
Test-Result "HTTP 400 for bad category"      ($r.status -eq 400)
Write-Host ""

# T25 — Create recipe with invalid ingredient
Write-Host "[ T25 ] POST /api/recipes (invalid ingredient_id)"
$BAD_ING = @"
{
  "recipe_name": "Bad Ingredient Recipe",
  "description": "test",
  "category_id": 1,
  "instructions": "Cook everything together well.",
  "prep_time": 5,
  "cook_time": 10,
  "difficulty": "EASY",
  "servings": 1,
  "ingredients": [{ "ingredient_id": 999999, "quantity": 100, "unit": "g" }],
  "dietary_tag_ids": []
}
"@
$r = Invoke-API POST "$BASE/recipes" -BodyJson $BAD_ING -Token $TOKEN
Test-Result "HTTP 400 for invalid ingredient" ($r.status -eq 400)
Write-Host ""

# T26 — Create recipe with duplicate ingredient IDs (transaction rollback)
Write-Host "[ T26 ] POST /api/recipes (duplicate ingredient IDs)"
$DUP_ING = @"
{
  "recipe_name": "Duplicate Ingredient Recipe",
  "description": "test",
  "category_id": 1,
  "instructions": "Cook everything together well.",
  "prep_time": 5,
  "cook_time": 10,
  "difficulty": "EASY",
  "servings": 1,
  "ingredients": [
    { "ingredient_id": 1, "quantity": 100, "unit": "g" },
    { "ingredient_id": 1, "quantity": 200, "unit": "g" }
  ],
  "dietary_tag_ids": []
}
"@
$r = Invoke-API POST "$BASE/recipes" -BodyJson $DUP_ING -Token $TOKEN
Test-Result "HTTP 400 for duplicate ingredients" ($r.status -eq 400)
Write-Host ""

# T27 — Update own recipe
Write-Host "[ T27 ] PUT /api/recipes/$NEW_RECIPE_ID (update own recipe)"
$UPDATE_BODY = @"
{
  "recipe_name": "Updated Test Recipe $RND",
  "description": "Updated description",
  "category_id": 2,
  "instructions": "Updated instructions for the test recipe cooking.",
  "prep_time": 15,
  "cook_time": 25,
  "difficulty": "MEDIUM",
  "servings": 4,
  "ingredients": [
    { "ingredient_id": 3, "quantity": 3, "unit": "piece", "notes": "beaten" }
  ],
  "dietary_tag_ids": []
}
"@
$r = Invoke-API PUT "$BASE/recipes/$NEW_RECIPE_ID" -BodyJson $UPDATE_BODY -Token $TOKEN
Test-Result "HTTP 200"                        ($r.status -eq 200)
Test-Result "name updated"                    ($r.body.data.recipe.recipe_name -like "Updated*")
Test-Result "difficulty updated to MEDIUM"    ($r.body.data.recipe.difficulty -eq "MEDIUM")
Test-Result "ingredients updated (1)"         ($r.body.data.recipe.ingredients.Count -eq 1)
Write-Host ""

# T28 — Try to update PREDEFINED recipe
Write-Host "[ T28 ] PUT /api/recipes/101 (predefined — should fail)"
$r = Invoke-API PUT "$BASE/recipes/101" -BodyJson $UPDATE_BODY -Token $TOKEN
Test-Result "HTTP 403 for predefined"         ($r.status -eq 403)
Write-Host ""

# T29 — Try to update another user's recipe (recipe 104 belongs to user_id=1, NOT our test user)
Write-Host "[ T29 ] PUT /api/recipes/104 (another user's recipe — should fail)"
$r = Invoke-API PUT "$BASE/recipes/104" -BodyJson $UPDATE_BODY -Token $TOKEN
Test-Result "HTTP 403 for wrong owner"        ($r.status -eq 403)
Write-Host ""

# T30 — My recipes (authenticated)
Write-Host "[ T30 ] GET /api/recipes/my-recipes"
$r = Invoke-API GET "$BASE/recipes/my-recipes" -Token $TOKEN
Test-Result "HTTP 200"                        ($r.status -eq 200)
Test-Result "recipes array"                   ($r.body.data.recipes -ne $null)
Test-Result "pagination present"              ($r.body.data.pagination -ne $null)
Test-Result "at least 1 own recipe"           ($r.body.data.recipes.Count -ge 1)
Write-Host ""

# T31 — My recipes without auth
Write-Host "[ T31 ] GET /api/recipes/my-recipes (no auth)"
$r = Invoke-API GET "$BASE/recipes/my-recipes"
Test-Result "HTTP 401 without token"          ($r.status -eq 401)
Write-Host ""

# T32 — Validation: missing required fields
Write-Host "[ T32 ] POST /api/recipes (validation — missing fields)"
$r = Invoke-API POST "$BASE/recipes" -BodyJson '{"recipe_name":""}' -Token $TOKEN
Test-Result "HTTP 400 for missing fields"     ($r.status -eq 400)
Test-Result "errors array present"            ($r.body.errors -ne $null)
Write-Host ""

# T33 — Delete own recipe
Write-Host "[ T33 ] DELETE /api/recipes/$NEW_RECIPE_ID (delete own recipe)"
$r = Invoke-API DELETE "$BASE/recipes/$NEW_RECIPE_ID" -Token $TOKEN
Test-Result "HTTP 200"                        ($r.status -eq 200)
Write-Host ""

# T34 — Confirm deleted recipe is gone
Write-Host "[ T34 ] GET /api/recipes/$NEW_RECIPE_ID (after delete)"
$r = Invoke-API GET "$BASE/recipes/$NEW_RECIPE_ID"
Test-Result "HTTP 404 after delete"           ($r.status -eq 404)
Write-Host ""

# T35 — Delete PREDEFINED recipe (should fail)
Write-Host "[ T35 ] DELETE /api/recipes/101 (predefined — should fail)"
$r = Invoke-API DELETE "$BASE/recipes/101" -Token $TOKEN
Test-Result "HTTP 403 for predefined"         ($r.status -eq 403)
Write-Host ""

# T36 — Delete ingredient that is in use (should be rejected)
Write-Host "[ T36 ] DELETE /api/ingredients/1 (in use — should fail)"
$r = Invoke-API DELETE "$BASE/ingredients/1" -Token $TOKEN
Test-Result "HTTP 409 — ingredient in use"    ($r.status -eq 409)
Write-Host ""

# T37 — Delete test ingredient (not in use)
Write-Host "[ T37 ] DELETE /api/ingredients/$NEW_ING_ID (clean up)"
$r = Invoke-API DELETE "$BASE/ingredients/$NEW_ING_ID" -Token $TOKEN
Test-Result "HTTP 200 — deleted successfully" ($r.status -eq 200)
Write-Host ""

# T38 — Phase 1 auth still works
Write-Host "[ T38 ] Phase 1: GET /api/auth/me still works"
$r = Invoke-API GET "$BASE/auth/me" -Token $TOKEN
Test-Result "HTTP 200 — Phase 1 unaffected"   ($r.status -eq 200)
Test-Result "user data returned"              ($r.body.data.user.email -eq $TEST_EMAIL)
Write-Host ""

# T39 — Health check still works
Write-Host "[ T39 ] GET /api/health (Phase 1 health check)"
$r = Invoke-API GET "$BASE/health"
Test-Result "HTTP 200 — health check OK"      ($r.status -eq 200)
Test-Result "database = connected"            ($r.body.database -eq "connected")
Write-Host ""

# ── Summary ───────────────────────────────────────────────────────────────────
$TOTAL = $PASS + $FAIL
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $PASS / $TOTAL passed" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Yellow" })
if ($FAIL -eq 0) {
  Write-Host "  ✅  All tests passed. Phase 2 complete!" -ForegroundColor Green
} else {
  Write-Host "  ❌  $FAIL test(s) failed — review output above." -ForegroundColor Red
}
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
