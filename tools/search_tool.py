from crewai.tools import BaseTool
from duckduckgo_search import DDGS


def _run_search(query: str, max_results: int = 6) -> str:
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(
                    f"Title: {r['title']}\nURL: {r['href']}\nSummary: {r['body']}\n"
                )
        if not results:
            return "No results found for the given query."
        return "\n---\n".join(results)
    except Exception as e:
        return f"Search error: {str(e)}"


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web for information on a given topic. "
        "Input should be a search query string. "
        "Returns titles, URLs, and summaries of relevant results."
    )

    def _run(self, query: str) -> str:
        return _run_search(query=query)


class BraveSearchAliasTool(BaseTool):
    name: str = "brave_search"
    description: str = (
        "Alias of web_search. Use this with a search query string. "
        "Returns titles, URLs, and summaries of relevant results."
    )

    def _run(self, query: str) -> str:
        return _run_search(query=query)


web_search_tool = WebSearchTool()
brave_search_tool = BraveSearchAliasTool()
