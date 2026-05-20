#!/usr/bin/env bash
# ============================================================
# ForgeCode Community Intelligence Collector
# Collects feedback from Reddit, HN, and other sources about
# Codex CLI and Claude Code pain points + feature requests
# ============================================================
set -euo pipefail

OUTPUT_DIR="${1:-$HOME/Documents/forgecode/requirements/data}"
TIMESTAMP=$(date +%Y%m%d_%H%M)
mkdir -p "$OUTPUT_DIR"

OUTFILE="$OUTPUT_DIR/community_feedback_$TIMESTAMP.md"

cat > "$OUTFILE" << 'HEADER'
# Community Intelligence Report
## Sources: Reddit · Hacker News
HEADER

echo "" >> "$OUTFILE"
echo "Collected: $(date)" >> "$OUTFILE"
echo "---" >> "$OUTFILE"
echo "" >> "$OUTFILE"

echo "=== Starting community intelligence collection ==="

# --- Reddit: Search Claude Code feedback ---
echo "--- Reddit: Claude Code ---"
for query in "Claude Code complaints OR sucks OR missing OR bug" "Claude Code feature request OR wishlist OR roadmap" "Claude Code vs Cursor OR vs Copilot OR review OR feedback" "Claude Code terminal OR bash OR permissions OR annoying"; do
    echo "Searching: Claude Code - $(echo $query | head -c 60)..."
    result=$(curl -s "https://www.reddit.com/r/ClaudeCode/search.json?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&restrict_sr=on&sort=top&t=month&limit=5" \
      -H "User-Agent: ForgeCode/1.0 (community research)" 2>/dev/null || echo '{"data":{"children":[]}}')
    
    echo "$result" >> /tmp/reddit_raw_cc_"$TIMESTAMP".json
    
    # Extract titles and permalinks
    echo "$result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('data', {}).get('children', [])
    for item in items[:5]:
        d = item.get('data', {})
        title = d.get('title', '')
        ups = d.get('ups', 0)
        url = d.get('permalink', '')
        sub = d.get('subreddit', '')
        print(f'- [{title}](https://reddit.com{url}) (↑{ups}, r/{sub})')
except:
    pass
" 2>/dev/null >> "$OUTFILE"
done

# --- Reddit: Search Codex CLI feedback ---
echo ""
echo "--- Reddit: Codex CLI ---"
for query in "Codex CLI complaints OR sucks OR missing OR bug OR feedback" "OpenAI Codex CLI review OR compare OR experience" "Codex Claude Code comparison OR which OR better OR pros cons"; do
    echo "Searching: Codex - $(echo $query | head -c 60)..."
    result=$(curl -s "https://www.reddit.com/r/CodexCLI/search.json?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&restrict_sr=on&sort=top&t=month&limit=5" \
      -H "User-Agent: ForgeCode/1.0 (community research)" 2>/dev/null || echo '{"data":{"children":[]}}')
    
    echo "$result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('data', {}).get('children', [])
    for item in items[:5]:
        d = item.get('data', {})
        title = d.get('title', '')
        ups = d.get('ups', 0)
        url = d.get('permalink', '')
        sub = d.get('subreddit', '')
        print(f'- [{title}](https://reddit.com{url}) (↑{ups}, r/{sub})')
except:
    pass
" 2>/dev/null >> "$OUTFILE"
done

# --- Reddit: General agent tools ---
echo ""
echo "--- Reddit: General agent coding tool discussions ---"
for subreddit in "ClaudeAI" "OpenAI" "ArtificialIntelligence" "FutureOfAI" "CodeGeneration" "ExperiencedDevs"; do
    for query in "coding agent OR AI coding OR terminal assistant OR agentic coding" "best coding assistant OR most productive coding tool"; do
        echo "Searching: r/$subreddit ..."
        result=$(curl -s "https://www.reddit.com/r/$subreddit/search.json?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&restrict_sr=on&sort=top&t=month&limit=3" \
          -H "User-Agent: ForgeCode/1.0 (community research)" 2>/dev/null || echo '{"data":{"children":[]}}')
        
        echo "$result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('data', {}).get('children', [])
    for item in items[:3]:
        d = item.get('data', {})
        title = d.get('title', '')
        ups = d.get('ups', 0)
        url = d.get('permalink', '')
        print(f'- [{title}](https://reddit.com{url}) (↑{ups}, r/{sub})')
except:
    pass
" 2>/dev/null >> "$OUTFILE"
    done
done

# --- Hacker News search ---
echo ""
echo "--- Hacker News ---"
for query in "\"Claude Code\"" "\"Codex CLI\"" "\"AI coding\"" "\"coding agent\""; do
    echo "Searching HN: $(echo $query | head -c 40)..."
    result=$(curl -s "https://hn.algolia.com/api/v1/search?query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&tags=story&numericFilters=created_at_i>$(date -v-30d +%s)&hitsPerPage=10" \
      -H "User-Agent: ForgeCode/1.0" 2>/dev/null || echo '{"hits":[]}')
    
    echo "$result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for hit in data.get('hits', [])[:10]:
        title = hit.get('title', '')
        url = hit.get('url', '') or f'https://news.ycombinator.com/item?id={hit.get(\"objectID\", \"\")}'
        points = hit.get('points', 0)
        if title and 'Ask HN' not in title:
            print(f'- [{title}]({url}) (↑{points})')
except:
    pass
" 2>/dev/null >> "$OUTFILE"
done

# --- GitHub issues: Codex CLI ---
echo ""
echo "--- GitHub Issues: Codex CLI ---"
for label in "feature-request" "enhancement" "bug"; do
    echo "Searching Codex CLI issues: $label..."
    result=$(curl -s "https://api.github.com/search/issues?q=repo:openai/codex+label:$label+state:open+sort:reactions&per_page=5" \
      -H "Accept: application/vnd.github+json" 2>/dev/null || echo '{"items":[]}')
    
    echo "$result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for item in data.get('items', [])[:5]:
        title = item.get('title', '')
        url = item.get('html_url', '')
        reactions = item.get('reactions', {})
        total = sum(v for k,v in reactions.items() if isinstance(v, int))
        print(f'- [{title}]({url}) (👍{total})')
except:
    pass
" 2>/dev/null >> "$OUTFILE"
done

echo ""
echo "=== Collection complete ==="
echo "Output: $OUTFILE"
wc -l "$OUTFILE"
