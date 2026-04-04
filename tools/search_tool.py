from crewai.tools import BaseTool
from duckduckgo_search import DDGS


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web for information on a given topic. "
        "Input should be a search query string. "
        "Returns titles, URLs, and summaries of relevant results."
    )

    def _run(self, query: str) -> str:
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=6):
                    results.append(
                        f"Title: {r['title']}\nURL: {r['href']}\nSummary: {r['body']}\n"
                    )
            if not results:
                return "No results found for the given query."
            return "\n---\n".join(results)
        except Exception as e:
            return f"Search error: {str(e)}"


web_search_tool = WebSearchTool()
