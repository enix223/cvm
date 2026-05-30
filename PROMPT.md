# create a node cli named `cvm`

1. allow user to add profile with command: `cvm profile add <profile-name>`, and prompt user to input the claude code parameters:
   1. ANTHROPIC_AUTH_TOKEN
   2. ANTHROPIC_BASE_URL
   3. ANTHROPIC_MODEL
   4. ANTHROPIC_DEFAULT_OPUS_MODEL
   5. ANTHROPIC_DEFAULT_SONNET_MODEL
   6. ANTHROPIC_DEFAULT_HAIKU_MODEL
   7. CLAUDE_CODE_SUBAGENT_MODEL
   8. CLAUDE_CODE_EFFORT_LEVEL
2. save the profile to `~/.claude/settings-<profilename-name>.json`, use the claude code settings.json format
3. allow user to delete profile with command: `cvm profile delete <profile-name>`, delete the file `~/.claude/settings-<profilename-name>.json`
4. allow user to update profile with command: `cvm profile update <profile-name>`, show the current value in prompt, and allow user to edit and save
5. allow user to switch profile with command: `cvm profile activate <profile-name>`
6. allow to list the profile with command: `cvm profile list`