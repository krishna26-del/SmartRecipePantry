# ==============================================================================
# Phase 5 Automated Test Suite: Analytics Dashboard & Multi-user Isolation
# ==============================================================================

$BASE = "http://localhost:5000/api"
$PASS = 0
$FAIL = 0

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

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PHASE 5: ANALYTICS, INTEGRATION & ISOLATION TEST SUITE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Unauthenticated checks
Write-Host "`n--- Part 1: Security & Authentication Enforcement ---" -ForegroundColor Yellow
$endpoints = @(
    "/analytics/dashboard",
    "/analytics/pantry",
    "/analytics/recipes",
    "/analytics/cooking",
    "/analytics/food-waste",
    "/analytics/shopping",
    "/analytics/meal-planning"
)

foreach ($ep in $endpoints) {
    $res = Invoke-API "GET" "$BASE$ep"
    Test-Result "GET $ep rejected without token (401)" ($res.status -eq 401) "Status: $($res.status)"
}

# 2. Setup User A and User B
Write-Host "`n--- Part 2: User Creation & Authentication ---" -ForegroundColor Yellow
$rnd = Get-Random -Minimum 10000 -Maximum 99999
$userAEmail = "analyst_a_$rnd@example.com"
$userBEmail = "analyst_b_$rnd@example.com"

$regA = Invoke-API "POST" "$BASE/auth/register" -BodyJson (@{ name = "Analyst User A"; email = $userAEmail; password = "Password123" } | ConvertTo-Json)
$tokenA = $regA.body.data.token
Test-Result "User A registered and token received" ($tokenA -ne $null)

$regB = Invoke-API "POST" "$BASE/auth/register" -BodyJson (@{ name = "Analyst User B"; email = $userBEmail; password = "Password123" } | ConvertTo-Json)
$tokenB = $regB.body.data.token
Test-Result "User B registered and token received" ($tokenB -ne $null)

# Verify initially empty analytics for User A
$dashAInit = Invoke-API "GET" "$BASE/analytics/dashboard" -Token $tokenA
Test-Result "User A initial dashboard has 0 pantry items" ($dashAInit.body.data.pantry.total_items -eq 0)
Test-Result "User A initial dashboard has 0 cooked recipes" ($dashAInit.body.data.cooking.total_history_records -eq 0)
Test-Result "User A initial dashboard has 0 user created recipes" ($dashAInit.body.data.recipes.user_created -eq 0)

# 3. Populate data for User A
Write-Host "`n--- Part 3: Populate User A Kitchen Activity ---" -ForegroundColor Yellow

# Add pantry items for User A (1 expiring in 2 days, 1 good for 60 days)
$expSoon = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
$p1Body = @{ ingredient_id = 2; quantity = 200; unit = "ml"; expiry_date = $expSoon } | ConvertTo-Json
$p1 = Invoke-API "POST" "$BASE/pantry" -BodyJson $p1Body -Token $tokenA
Test-Result "User A added expiring pantry item (201)" ($p1.status -eq 201)

$expGood = (Get-Date).AddDays(60).ToString("yyyy-MM-dd")
$p2Body = @{ ingredient_id = 1; quantity = 500; unit = "g"; expiry_date = $expGood } | ConvertTo-Json
$p2 = Invoke-API "POST" "$BASE/pantry" -BodyJson $p2Body -Token $tokenA
Test-Result "User A added safe pantry item (201)" ($p2.status -eq 201)

# Add user recipe for User A
$recBody = @{
    recipe_name = "Analytics Delight Pasta $rnd"
    category_id = 1
    description = "A wonderful test pasta"
    instructions = "Boil and stir for 15 minutes."
    prep_time = 10
    cook_time = 15
    difficulty = "EASY"
    servings = 2
    ingredients = @(
        @{ ingredient_id = 1; quantity = 150; unit = "g"; notes = "sifted" }
    )
} | ConvertTo-Json -Depth 5
$recA = Invoke-API "POST" "$BASE/recipes" -BodyJson $recBody -Token $tokenA
Test-Result "User A created recipe (201)" ($recA.status -eq 201)
$recAId = $recA.body.data.recipe.recipe_id

# Favorite the recipe
$fav = Invoke-API "POST" "$BASE/favorites/$recAId" -Token $tokenA
Test-Result "User A favorited recipe (201)" ($fav.status -eq 201)

# Log cooking history for User A
$cookBody = @{
    recipe_id = $recAId
    servings_made = 2
    notes = "Turned out delicious"
} | ConvertTo-Json
$cook = Invoke-API "POST" "$BASE/cooking-history" -BodyJson $cookBody -Token $tokenA
Test-Result "User A logged cooking history (201)" ($cook.status -eq 201)

# Log food waste for User A
$wasteBody = @{
    ingredient_id = 2
    quantity = 50
    unit = "ml"
    reason = "EXPIRED"
    notes = "Forgot in fridge"
} | ConvertTo-Json
$waste = Invoke-API "POST" "$BASE/food-waste" -BodyJson $wasteBody -Token $tokenA
Test-Result "User A logged food waste (201)" ($waste.status -eq 201)

# Create shopping list & add items
$shopBody = @{ list_name = "Weekly Groceries $rnd" } | ConvertTo-Json
$shop = Invoke-API "POST" "$BASE/shopping-lists" -BodyJson $shopBody -Token $tokenA
$shopId = $shop.body.data.list.list_id

$itemBody = @{ ingredient_id = 3; quantity = 4; unit = "piece" } | ConvertTo-Json
$item1 = Invoke-API "POST" "$BASE/shopping-lists/$shopId/items" -BodyJson $itemBody -Token $tokenA
$itemId = $item1.body.data.item.list_item_id

$checkItem = Invoke-API "PATCH" "$BASE/shopping-lists/$shopId/items/$itemId/purchase" -Token $tokenA
Test-Result "User A created shopping list item and marked purchased" ($checkItem.status -eq 200)

# Create meal plan
$today = (Get-Date).ToString("yyyy-MM-dd")
$nextWeek = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$mpBody = @{
    plan_name = "Healthy Week $rnd"
    start_date = $today
    end_date = $nextWeek
} | ConvertTo-Json
$mp = Invoke-API "POST" "$BASE/meal-plans" -BodyJson $mpBody -Token $tokenA
$mpId = $mp.body.data.plan.meal_plan_id

$mealDay = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$mpItemBody = @{
    recipe_id = $recAId
    planned_date = $mealDay
    meal_type = "BREAKFAST"
    planned_servings = 2
} | ConvertTo-Json
$mpItem = Invoke-API "POST" "$BASE/meal-plans/$mpId/items" -BodyJson $mpItemBody -Token $tokenA
Test-Result "User A planned a meal (201)" ($mpItem.status -eq 201)

# 4. Verify User A Analytics Endpoints
Write-Host "`n--- Part 4: Test All Analytics Endpoints for User A ---" -ForegroundColor Yellow

# 4.1 Dashboard Summary
$dashA = Invoke-API "GET" "$BASE/analytics/dashboard" -Token $tokenA
Test-Result "GET /analytics/dashboard returned 200" ($dashA.status -eq 200)
Test-Result "Dashboard: total_items == 2" ($dashA.body.data.pantry.total_items -eq 2)
Test-Result "Dashboard: expiring_soon_items >= 1" ($dashA.body.data.pantry.expiring_soon_items -ge 1)
Test-Result "Dashboard: user_created recipes == 1" ($dashA.body.data.recipes.user_created -eq 1)
Test-Result "Dashboard: favorite_count == 1" ($dashA.body.data.recipes.favorite_count -eq 1)
Test-Result "Dashboard: total_history_records == 1" ($dashA.body.data.cooking.total_history_records -eq 1)
Test-Result "Dashboard: total_records wasted == 1" ($dashA.body.data.food_waste.total_records -eq 1)
Test-Result "Dashboard: shopping purchased_items == 1" ($dashA.body.data.shopping.purchased_items -eq 1)
Test-Result "Dashboard: meal_planning total_plans >= 1" ($dashA.body.data.meal_planning.total_plans -ge 1)

# 4.2 Pantry Analytics
$pantryAn = Invoke-API "GET" "$BASE/analytics/pantry" -Token $tokenA
Test-Result "GET /analytics/pantry returned 200" ($pantryAn.status -eq 200)
Test-Result "Pantry Analytics: total_items == 2" ($pantryAn.body.data.total_items -eq 2)
Test-Result "Pantry Analytics: quantities_by_unit returned" ($pantryAn.body.data.quantities_by_unit.Count -ge 1)

# 4.3 Recipe Analytics
$recAn = Invoke-API "GET" "$BASE/analytics/recipes" -Token $tokenA
Test-Result "GET /analytics/recipes returned 200" ($recAn.status -eq 200)
Test-Result "Recipe Analytics: user_created == 1" ($recAn.body.data.user_created -eq 1)
Test-Result "Recipe Analytics: recipes_by_category returned" ($recAn.body.data.recipes_by_category.Count -ge 1)

# 4.4 Cooking Analytics
$cookAn = Invoke-API "GET" "$BASE/analytics/cooking" -Token $tokenA
Test-Result "GET /analytics/cooking returned 200" ($cookAn.status -eq 200)
Test-Result "Cooking Analytics: total_cooking_records == 1" ($cookAn.body.data.total_cooking_records -eq 1)
Test-Result "Cooking Analytics: total_servings_made == 2" ($cookAn.body.data.total_servings_made -eq 2)

# 4.5 Food Waste Analytics
$wasteAn = Invoke-API "GET" "$BASE/analytics/food-waste" -Token $tokenA
Test-Result "GET /analytics/food-waste returned 200" ($wasteAn.status -eq 200)
Test-Result "Waste Analytics: total_records == 1" ($wasteAn.body.data.total_records -eq 1)
Test-Result "Waste Analytics: quantities_by_unit separates ml" ($wasteAn.body.data.quantities_by_unit[0].unit -eq "ml")
Test-Result "Waste Analytics: waste_by_reason includes EXPIRED" ($wasteAn.body.data.waste_by_reason[0].reason -eq "EXPIRED")

# 4.6 Shopping Analytics
$shopAn = Invoke-API "GET" "$BASE/analytics/shopping" -Token $tokenA
Test-Result "GET /analytics/shopping returned 200" ($shopAn.status -eq 200)
Test-Result "Shopping Analytics: total_lists >= 1" ($shopAn.body.data.total_lists -ge 1)
Test-Result "Shopping Analytics: completion_percentage == 100%" ($shopAn.body.data.completion_percentage -eq 100)

# 4.7 Meal Planning Analytics
$mpAn = Invoke-API "GET" "$BASE/analytics/meal-planning" -Token $tokenA
Test-Result "GET /analytics/meal-planning returned 200" ($mpAn.status -eq 200)
Test-Result "Meal Planning Analytics: total_plans >= 1" ($mpAn.body.data.total_plans -ge 1)
Test-Result "Meal Planning Analytics: total_planned_meals >= 1" ($mpAn.body.data.total_planned_meals -ge 1)

# 5. Multi-User Isolation Verification
Write-Host "`n--- Part 5: Multi-User Isolation Verification ---" -ForegroundColor Yellow
$dashB = Invoke-API "GET" "$BASE/analytics/dashboard" -Token $tokenB
Test-Result "User B dashboard total_items is strictly 0 (no leak from User A)" ($dashB.body.data.pantry.total_items -eq 0)
Test-Result "User B dashboard user_created recipes is strictly 0" ($dashB.body.data.recipes.user_created -eq 0)
Test-Result "User B dashboard favorite_count is strictly 0" ($dashB.body.data.recipes.favorite_count -eq 0)
Test-Result "User B dashboard total_history_records is strictly 0" ($dashB.body.data.cooking.total_history_records -eq 0)
Test-Result "User B dashboard total_records wasted is strictly 0" ($dashB.body.data.food_waste.total_records -eq 0)
Test-Result "User B dashboard total_lists is strictly 0" ($dashB.body.data.shopping.total_lists -eq 0)
Test-Result "User B dashboard total_plans is strictly 0" ($dashB.body.data.meal_planning.total_plans -eq 0)

$summaryColor = "Green"
if ($FAIL -gt 0) { $summaryColor = "Red" }
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " TEST RESULTS SUMMARY: $PASS PASSED, $FAIL FAILED" -ForegroundColor $summaryColor
Write-Host "==========================================================" -ForegroundColor Cyan

if ($FAIL -gt 0) {
    exit 1
} else {
    exit 0
}
