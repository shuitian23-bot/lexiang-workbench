# Interaction States

## AI Generation

- Streaming answers should show progressive content and a stop action.
- Loading states should say what is happening, for example `正在分析文件...` or `正在调用技能...`. PC assistant generating states should use shimmer/skeleton with a brand-colored pulse indicator; `.lx-generating` must not set a fixed `width` and should inherit the AI message column width.
- Avoid generic indefinite labels such as `加载中` when the system knows the task type.
- Completed answers expose copy, retry, continue, and source/citation actions when applicable.

## Agent Task Flow

- Show the current stage: planning, executing, waiting, reviewing, completed.
- If user input is needed, pause clearly and place the required control near the message.
- If a tool/plugin call fails, state the failure, impact, and available retry path.
- Keep activity logs collapsible for long tasks.

## Empty States

- Empty states should be useful, compact, and product-specific.
- Offer 2-4 realistic prompt suggestions or next actions.
- Avoid marketing slogans or long explanations.

## Error States

- Explain the concrete issue in Chinese.
- Offer one primary recovery action and one secondary option when useful.
- Preserve user input whenever possible.

## Permission And Privacy

- Ask for permission before using sensitive files, account data, or external tools.
- Make permission prompts specific: what will be used, why, and what the user can do next.

## AI Disclaimer

Use a muted disclaimer on generated answers and task results. Example:

`内容由联想乐享基于当前信息生成，请在使用前核对关键信息。`
