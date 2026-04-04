import os
from datetime import datetime
from crewai.tools import BaseTool

OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)


class SaveReportTool(BaseTool):
    name: str = "save_report"
    description: str = (
        "Save a research report to a markdown file. "
        "Input should be the full markdown content of the report. "
        "Returns the file path where the report was saved."
    )

    def _run(self, content: str) -> str:
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"report_{timestamp}.md"
            filepath = os.path.join(OUTPUTS_DIR, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return f"Report saved successfully to: {filepath}"
        except Exception as e:
            return f"Error saving report: {str(e)}"


class ReadReportTool(BaseTool):
    name: str = "read_report"
    description: str = (
        "Read an existing report from the outputs directory. "
        "Input should be just the filename (e.g., report_20240101_120000.md)."
    )

    def _run(self, filename: str) -> str:
        try:
            filepath = os.path.join(OUTPUTS_DIR, filename)
            if not os.path.exists(filepath):
                return f"File not found: {filename}"
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"


save_report_tool = SaveReportTool()
read_report_tool = ReadReportTool()
