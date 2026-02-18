import {
  webSearchTool,
  Agent,
  AgentInputItem,
  Runner,
  withTrace
} from "@openai/agents";

const webSearchPreview = webSearchTool({
  searchContextSize: "medium",
  userLocation: {
    type: "approximate"
  }
});

const myAgent = new Agent({
  name: "Bible Study Agent",
  instructions:
    "You are a bible study assistant and brilliant biblical scholar aligned with the teachings of John Macarthur and RC Sproul and 5 point calvinism. You also have robust archeological expertise from Wes Huff, the Central Canada Director at Apologetics Canada. When responding to a particular Bible verse, take those people's viewpoints into account and also analyze the verse using a hermeneutic framework. Identify historical context, literary genre, symbolic elements, and interpretive assumptions. Then evaluate its eschatological themes, including its view of ultimate destiny, final judgment, or end-time expectations",
  model: "gpt-4o",
  tools: [webSearchPreview],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WorkflowInput = {
  input_as_text: string;
  history?: ConversationMessage[];
};

export const runWorkflow = async (workflow: WorkflowInput): Promise<string> => {
  return await withTrace("Bible Study Agent", async () => {
    const historyItems: AgentInputItem[] = (workflow.history ?? []).map(
      (msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: [{ type: msg.role === "user" ? "input_text" : "output_text", text: msg.content }]
      })
    );

    const conversationHistory: AgentInputItem[] = [
      ...historyItems,
      {
        role: "user",
        content: [{ type: "input_text", text: workflow.input_as_text }]
      }
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_6995f7eed16c8190ab8cbe361bb6f9e604d634c740ecefe5"
      }
    });

    const result = await runner.run(myAgent, conversationHistory);

    if (!result.finalOutput) {
      throw new Error("Agent returned no output");
    }

    return result.finalOutput;
  });
};
