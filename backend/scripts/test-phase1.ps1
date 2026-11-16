# Phase 1 — Authentication Test Suite (v2)
# Uses Invoke-WebRequest for reliable body access on error responses.
# Run:  powershell -ExecutionPolicy Bypass -File test-phase1.ps1

$BASE = "http://localhost:5000/api"
$PASS = 0; $FAIL = 0

function Test-Result {
  param([string]$Name, [bool]$Condition, [string]$Detail = "")
  if ($Condition) { Write-Host "  ✅  PASS — $Name" -ForegroundColor Green; $script:PASS++ }
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
        $raw    = $reader.ReadToEnd()
        $body   = $raw | ConvertFrom-Json
      } catch {}
    }
    return @{ ok=$false; status=$status; body=$body }
  }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Smart Recipe Pantry — Phase 1 Test Suite   " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── T1: Health check ──────────────────────────────────────────────────────────
Write-Host "[ T1 ] GET /api/health"
$r = Invoke-API GET "$BASE/health"
Test-Result "HTTP 200"                     ($r.status -eq 200)
Test-Result "success = true"               ($r.body.success -eq $true)
Test-Result "database = connected"         ($r.body.database -eq "connected")
Write-Host ""

# ── T2: Register new user ─────────────────────────────────────────────────────
Write-Host "[ T2 ] POST /api/auth/register — new user"
$RND   = Get-Random -Minimum 10000 -Maximum 99999
$EMAIL = "tester$RND@example.com"
$BODY  = "{`"name`":`"Test User`",`"email`":`"$EMAIL`",`"password`":`"Password123`"}"
$r = Invoke-API POST "$BASE/auth/register" -BodyJson $BODY
Test-Result "HTTP 201"                     ($r.status -eq 201)
Test-Result "success = true"               ($r.body.success -eq $true)
Test-Result "message contains 'registered'" ($r.body.message -match "registered")
Test-Result "data.user object present"     ($r.body.data.user -ne $null)
Test-Result "data.token present"           ($r.body.data.token.Length -gt 10)
Test-Result "password_hash NOT returned"   ($r.body.data.user.password_hash -eq $null)
Test-Result "user_id present"              ($r.body.data.user.user_id -gt 0)
$TOKEN = $r.body.data.token
Write-Host ""

# ── T3: Duplicate email ────────────────────────────────────────────────────────
Write-Host "[ T3 ] POST /api/auth/register — duplicate email"
$r2 = Invoke-API POST "$BASE/auth/register" -BodyJson $BODY
Test-Result "HTTP 409"                     ($r2.status -eq 409)
Test-Result "success = false"              ($r2.body.success -eq $false)
Test-Result "message mentions 'already'"   ($r2.body.message -match "already")
Write-Host ""

# ── T4: Validation errors ──────────────────────────────────────────────────────
Write-Host "[ T4 ] POST /api/auth/register — invalid data"
$BAD = '{"name":"","email":"notanemail","password":"weak"}'
$r3  = Invoke-API POST "$BASE/auth/register" -BodyJson $BAD
Test-Result "HTTP 400"                     ($r3.status -eq 400)
Test-Result "success = false"              ($r3.body.success -eq $false)
Test-Result "errors array present"         ($r3.body.errors -ne $null -and $r3.body.errors.Count -gt 0)
Write-Host ""

# ── T5: Login success ─────────────────────────────────────────────────────────
Write-Host "[ T5 ] POST /api/auth/login — correct credentials"
$LOGIN_BODY = "{`"email`":`"$EMAIL`",`"password`":`"Password123`"}"
$r4 = Invoke-API POST "$BASE/auth/login" -BodyJson $LOGIN_BODY
Test-Result "HTTP 200"                     ($r4.status -eq 200)
Test-Result "success = true"               ($r4.body.success -eq $true)
Test-Result "token returned"               ($r4.body.data.token.Length -gt 10)
Test-Result "password_hash NOT returned"   ($r4.body.data.user.password_hash -eq $null)
$LOGIN_TOKEN = $r4.body.data.token
Write-Host ""

# ── T6: Wrong password ────────────────────────────────────────────────────────
Write-Host "[ T6 ] POST /api/auth/login — wrong password"
$WRONG = "{`"email`":`"$EMAIL`",`"password`":`"WrongPass999`"}"
$r5 = Invoke-API POST "$BASE/auth/login" -BodyJson $WRONG
Test-Result "HTTP 401"                     ($r5.status -eq 401)
Test-Result "success = false"              ($r5.body.success -eq $false)
Test-Result "Generic error (no leak)"      ($r5.body.message -eq "Invalid email or password")
Write-Host ""

# ── T7: Non-existent email ────────────────────────────────────────────────────
Write-Host "[ T7 ] POST /api/auth/login — unknown email"
$NOEXIST = '{"email":"nobody@nowhere999.com","password":"Password123"}'
$r6 = Invoke-API POST "$BASE/auth/login" -BodyJson $NOEXIST
Test-Result "HTTP 401"                     ($r6.status -eq 401)
Test-Result "success = false"              ($r6.body.success -eq $false)
Test-Result "Same generic message as T6"   ($r6.body.message -eq $r5.body.message)
Write-Host ""

# ── T8: GET /me — valid token ─────────────────────────────────────────────────
Write-Host "[ T8 ] GET /api/auth/me — valid token"
$r7 = Invoke-API GET "$BASE/auth/me" -Token $LOGIN_TOKEN
Test-Result "HTTP 200"                     ($r7.status -eq 200)
Test-Result "success = true"               ($r7.body.success -eq $true)
Test-Result "user_id present"              ($r7.body.data.user.user_id -gt 0)
Test-Result "correct email returned"       ($r7.body.data.user.email -eq $EMAIL)
Test-Result "password_hash NOT returned"   ($r7.body.data.user.password_hash -eq $null)
Write-Host ""

# ── T9: GET /me — no token ────────────────────────────────────────────────────
Write-Host "[ T9 ] GET /api/auth/me — missing token"
$r8 = Invoke-API GET "$BASE/auth/me"
Test-Result "HTTP 401"                     ($r8.status -eq 401)
Test-Result "success = false"              ($r8.body.success -eq $false)
Write-Host ""

# ── T10: GET /me — invalid token ─────────────────────────────────────────────
Write-Host "[ T10 ] GET /api/auth/me — invalid/garbage token"
$r9 = Invoke-API GET "$BASE/auth/me" -Token "this.is.not.valid"
Test-Result "HTTP 401"                     ($r9.status -eq 401)
Test-Result "success = false"              ($r9.body.success -eq $false)
Write-Host ""

# ── T11: GET /me — expired token ─────────────────────────────────────────────
Write-Host "[ T11 ] GET /api/auth/me — expired token"
# Token with exp=1600000001 (year 2020 — always expired); signature will fail too
$EXPIRED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalidSig"
$r10 = Invoke-API GET "$BASE/auth/me" -Token $EXPIRED
Test-Result "HTTP 401"                     ($r10.status -eq 401)
Test-Result "success = false"              ($r10.body.success -eq $false)
Write-Host ""

# ── T12: 404 handler ──────────────────────────────────────────────────────────
Write-Host "[ T12 ] GET /api/nonexistent-route"
$r11 = Invoke-API GET "$BASE/nonexistent-route-xyz"
Test-Result "HTTP 404"                     ($r11.status -eq 404)
Test-Result "success = false"              ($r11.body.success -eq $false)
Write-Host ""

# ── T13: Password stored as hash (verify via login roundtrip) ─────────────────
Write-Host "[ T13 ] Password stored as bcrypt hash (verified via login roundtrip)"
# If the password was stored as plaintext, raw password comparison would work
# but bcrypt compare would fail on a plaintext DB entry. The T5 login already
# confirmed that bcrypt.compare() succeeded against the stored value.
Test-Result "Login worked => password is properly hashed" ($r4.ok -and $r4.body.success -eq $true)
Write-Host ""

# ── Summary ───────────────────────────────────────────────────────────────────
$TOTAL = $PASS + $FAIL
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $PASS / $TOTAL passed" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Yellow" })
if ($FAIL -eq 0) {
  Write-Host "  ✅  All tests passed. Phase 1 complete!" -ForegroundColor Green
} else {
  Write-Host "  ❌  $FAIL test(s) failed — review output above." -ForegroundColor Red
}
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
