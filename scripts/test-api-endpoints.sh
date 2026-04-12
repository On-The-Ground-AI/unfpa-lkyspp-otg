#!/bin/bash

# UNFPA OTG API Endpoint Tests
# Quick validation of all clinical API endpoints

API_BASE_URL="${1:-http://localhost:3000}"
SESSION_ID=$(uuidgen)

echo "🧪 UNFPA OTG API Endpoint Tests"
echo "================================"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Session ID: $SESSION_ID"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -n "Testing $description... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL$endpoint" \
      -H "x-session-id: $SESSION_ID" \
      -H "x-country: Uganda" \
      -H "x-language: en" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" \
      -H "x-session-id: $SESSION_ID" \
      -H "x-country: Uganda" \
      -H "x-language: en" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} ($http_code)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} (expected: $expected_status, got: $http_code)"
    echo "  Response: $body"
    ((TESTS_FAILED++))
  fi
}

echo "🏥 Clinical API Endpoints"
echo "========================"
echo ""

# Test health check
test_endpoint "GET" "/api/health" "" "200" "Health Check"

# Test clinical search
echo ""
test_endpoint "POST" "/api/clinical/search" \
  '{"query":"postpartum hemorrhage management"}' \
  "200" \
  "Clinical Search"

# Test drug lookup
echo ""
test_endpoint "POST" "/api/clinical/formulary" \
  '{"drug":"oxytocin"}' \
  "200" \
  "Drug Lookup"

# Test guidelines
echo ""
test_endpoint "GET" "/api/clinical/guidelines" "" "200" "Guidelines List"

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
