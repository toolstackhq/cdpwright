## CDP Update Recovery Prompt

Use this prompt whenever CDP protocol changes break the library and you want the assistant to apply the full recovery playbook:

```
I’m seeing failures due to a CDP protocol change. Follow the CDP recovery playbook you outlined: pin/repro on a specific Chromium revision (CHROMIUM_AUTOMATON_REVISION or downloader), capture failing protocol messages; diff our checked-in protocol schema vs the latest browser_protocol.json + js_protocol.json to find renamed/added/removed methods/events/params; regenerate protocol types/wrappers and fix call sites for new required params; add version-based feature gates using /json/version when needed; make parsing tolerant of unknown fields or missing optional fields; run integration/unit tests against both the known-good revision and the new one; if the break is severe, keep the old pinned revision as a stable channel until the fix is ready, then bump the default. Apply all needed code and doc changes to complete this update.
```
