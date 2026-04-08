from crewai.tools import BaseTool
import numexpr as ne

class CalculatorTool(BaseTool):
    name: str = "calculator"
    description: str = (
        "A useful tool for evaluating mathematical expressions. "
        "Input should be a string containing a valid mathematical expression (e.g., '2 + 2', '25 * 4 / 2'). "
        "Returns the numerically evaluated result."
    )

    def _run(self, expression: str) -> str:
        try:
            # Use numexpr to safely evaluate math expressions
            result = ne.evaluate(expression)
            return str(result.item() if hasattr(result, "item") else result)
        except Exception as e:
            return f"Error evaluating expression: {str(e)}. Please provide a valid mathematical expression."

calculator_tool = CalculatorTool()
