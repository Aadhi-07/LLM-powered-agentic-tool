import requests
from crewai.tools import BaseTool


class WikipediaTool(BaseTool):
    name: str = "Wikipedia Search"
    description: str = (
        "Useful for finding academic and factual information about people, places, "
        "concepts, and history on Wikipedia. "
        "Input should be a clear search query string."
    )

    def _run(self, query: str) -> str:
        try:
            url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": query,
                "utf8": 1,
                "srlimit": 3,
            }
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            results = []
            for row in data.get("query", {}).get("search", []):
                snippet = (
                    row["snippet"]
                    .replace('<span class="searchmatch">', "")
                    .replace("</span>", "")
                )
                results.append(f"Title: {row['title']}\nSnippet: {snippet}")
            if not results:
                return "No Wikipedia results found."
            return "\n\n".join(results)
        except Exception as e:
            return f"Wikipedia search failed: {e}"


wikipedia_tool = WikipediaTool()