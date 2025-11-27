
from typing import Any
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain.agents import create_agent


@tool
def mini_calculator(expression: str) -> str:
    """
    Lille lommeregner, der kan regne simple Python-regneudtryk.
    Eksempler: "2+2*10", "100 / 4", "3*(5+1)".
    Returnerer resultatet som tekst.
    """
    try:
        # eval uden builtins for at begrænse hvad der kan køres
        result = eval(expression, {"__builtins__": {}})
        return f"Resultatet af {expression} er {result}"
    except Exception as e:
        return f"Kunne ikke beregne udtrykket '{expression}': {e}"


def build_agent():
    """Opretter og returnerer en simpel LangChain-agent med ét tool."""
    model = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
    )

    tools = [mini_calculator]

    agent = create_agent(
        model=model,
        tools=tools,
        system_prompt=(
            "Du er en hjælpsom dansk assistent. "
            "Du kan bruge værktøjet 'mini_calculator' til beregninger. "
            "Svar altid på dansk og forklar kort, hvad du gør."
        ),
    )
    return agent


def main() -> None:
    agent = build_agent()
    print("Mini LangChain-agent (på dansk). Skriv 'stop' for at afslutte.\n")

    while True:
        user_input = input("Du: ")

        if user_input.lower() in ["stop", "quit", "exit"]:
            print("Agent: Hej hej 👋")
            break

        # Agenten forventer en state med messages
        result: dict[str, Any] = agent.invoke(
            {"messages": [{"role": "user", "content": user_input}]}
        )

        # Sidste besked er typisk modellens svar
        messages = result.get("messages", [])
        if not messages:
            print("Agent: (ingen svar fra agenten)\n")
            continue

        last_msg = messages[-1]
        # BaseMessage har .content-attribut
        answer = getattr(last_msg, "content", "(ingen content)")
        print(f"Agent: {answer}\n")


if __name__ == "__main__":
    main()
