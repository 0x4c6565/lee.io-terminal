/**
 * @class Renderer
 * @description Handles all DOM manipulation and rendering for the terminal
 */
class Renderer {
    /**
     * @param {HTMLElement} terminalElement - The terminal DOM element
     * @param {string} promptPrefix - The prompt prefix to display
     */
    constructor(terminalElement, promptPrefix) {
        this.terminal = terminalElement;
        this.promptPrefix = promptPrefix;
        this.outputNode = null;
        this.inputNode = null;
        this.promptNode = null;
        this.inputBeforeNode = null;
        this.cursorNode = null;
        this.inputAfterNode = null;
    }

    /**
     * Initialize the renderer's DOM elements
     */
    initialize() {
        this.terminal.textContent = "";
        this.outputNode = document.createElement("span");
        this.inputNode = document.createElement("span");
        this.promptNode = document.createTextNode("");
        this.inputBeforeNode = document.createTextNode("");
        this.cursorNode = document.createElement("span");
        this.cursorNode.className = "cursor";
        this.inputAfterNode = document.createTextNode("");

        this.inputNode.appendChild(this.promptNode);
        this.inputNode.appendChild(this.inputBeforeNode);
        this.inputNode.appendChild(this.cursorNode);
        this.inputNode.appendChild(this.inputAfterNode);
        this.terminal.appendChild(this.outputNode);
        this.terminal.appendChild(this.inputNode);
    }

    /**
     * Keep viewport pinned to the latest terminal output
     */
    scrollToBottom() {
        this.terminal.scrollTop = this.terminal.scrollHeight - this.terminal.clientHeight;
    }

    /**
     * Render only output text without touching the editable input row
     * @param {string} output - Current output text
     */
    renderOutput(output) {
        this.outputNode.textContent = output;
        this.scrollToBottom();
    }

    /**
     * Render the current terminal state
     * @param {string} output - Current output text
     * @param {string} inputBuffer - Current input buffer
     * @param {number} cursorX - Current cursor position
     */
    render(output, inputBuffer, cursorX, promptPrefix = this.promptPrefix) {
        const inputBefore = inputBuffer.substring(0, cursorX);
        const inputAtCursor = (inputBuffer.length > cursorX) ? inputBuffer.charAt(cursorX) : " ";
        const inputAfter = (inputBuffer.length > cursorX) ? inputBuffer.substring(cursorX + 1) : "";

        this.renderOutput(output);
        this.promptNode.nodeValue = promptPrefix;
        this.inputBeforeNode.nodeValue = inputBefore;
        this.cursorNode.textContent = inputAtCursor;
        this.inputAfterNode.nodeValue = inputAfter;
        this.scrollToBottom();
    }

    /**
     * Get the terminal element for event listeners
     * @returns {HTMLElement} The terminal element
     */
    getElement() {
        return this.terminal;
    }

    /**
     * Focus the terminal
     */
    focus() {
        this.terminal.focus();
    }
}

/**
 * @class InputBuffer
 * @description Manages terminal input buffer state
 */
class InputBuffer {
    constructor() {
        this.buffer = '';
        this.cursorX = 0;
    }

    /**
     * Write text at cursor position
     * @param {string} text - Text to write
     */
    write(text = '') {
        const cursorSuffix = this.buffer.substring(this.cursorX);
        this.buffer = this.buffer.substring(0, this.cursorX) + text + cursorSuffix;
        this.cursorX += text.length;
    }

    /**
     * Delete character before cursor (backspace)
     */
    deleteBeforeCursor() {
        if (this.cursorX === 0) return;
        const cursorSuffix = this.buffer.substring(this.cursorX);
        this.buffer = this.buffer.substring(0, this.cursorX - 1) + cursorSuffix;
        this.cursorX--;
    }

    /**
     * Delete character at cursor (delete)
     */
    deleteAtCursor() {
        if (this.cursorX >= this.buffer.length) return;
        const cursorSuffix = this.buffer.substring(this.cursorX + 1);
        this.buffer = this.buffer.substring(0, this.cursorX) + cursorSuffix;
    }

    /**
     * Delete word before cursor (Ctrl+Backspace/Alt+Backspace)
     */
    deleteWordBeforeCursor() {
        if (this.cursorX === 0) return;

        let start = this.cursorX;
        while (start > 0 && /\s/.test(this.buffer.charAt(start - 1))) {
            start--;
        }
        while (start > 0 && !/\s/.test(this.buffer.charAt(start - 1))) {
            start--;
        }

        this.buffer = this.buffer.substring(0, start) + this.buffer.substring(this.cursorX);
        this.cursorX = start;
    }

    /**
     * Delete word after cursor (Ctrl+Delete/Alt+Delete)
     */
    deleteWordAfterCursor() {
        if (this.cursorX >= this.buffer.length) return;

        let end = this.cursorX;
        while (end < this.buffer.length && /\s/.test(this.buffer.charAt(end))) {
            end++;
        }
        while (end < this.buffer.length && !/\s/.test(this.buffer.charAt(end))) {
            end++;
        }

        this.buffer = this.buffer.substring(0, this.cursorX) + this.buffer.substring(end);
    }

    /**
     * Move cursor to start
     */
    cursorToStart() {
        this.cursorX = 0;
    }

    /**
     * Move cursor to end
     */
    cursorToEnd() {
        this.cursorX = this.buffer.length;
    }

    /**
     * Move cursor left
     */
    cursorLeft() {
        if (this.cursorX > 0) this.cursorX--;
    }

    /**
     * Move cursor right
     */
    cursorRight() {
        if (this.cursorX < this.buffer.length) this.cursorX++;
    }

    /**
     * Clear and reset the input buffer
     */
    reset() {
        this.buffer = '';
        this.cursorX = 0;
    }

    /**
     * Get the current buffer content
     * @returns {string} The buffer content
     */
    getContent() {
        return this.buffer;
    }

    /**
     * Get the current cursor position
     * @returns {number} The cursor position
     */
    getCursorX() {
        return this.cursorX;
    }
}

/**
 * @class KeyboardHandler
 * @description Handles keyboard input events
 */
class KeyboardHandler {
    /**
     * @param {Terminal} terminal - The terminal instance
     */
    constructor(terminal) {
        this.terminal = terminal;
        this.element = null;
    }

    /**
     * Attach keyboard event listener
     * @param {HTMLElement} element - Element to attach listener to
     */
    attach(element) {
        this.element = element;
        element.addEventListener('keydown', (e) => this.handleKeyDown(e));
        element.addEventListener('paste', (e) => this.handlePaste(e));
    }

    /**
     * Check whether text is selected inside the terminal element
     * @returns {boolean} Whether terminal text is selected
     */
    hasTerminalSelection() {
        const selection = window.getSelection?.();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return false;
        }

        if (!this.element) {
            return false;
        }

        const range = selection.getRangeAt(0);
        return this.element.contains(range.commonAncestorContainer);
    }

    /**
     * Handle paste event
     * @param {ClipboardEvent} e - The clipboard event
     */
    handlePaste(e) {
        e.preventDefault();

        const pastedText = e.clipboardData?.getData("text") || "";
        if (!pastedText) {
            return;
        }

        // Keep the terminal input single-line for predictable command parsing.
        const normalizedText = pastedText
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n/g, " ");

        if (normalizedText.length > 0) {
            this.terminal.writeInputAtCursor(normalizedText);
        }
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - The keyboard event
     */
    async handleKeyDown(e) {
        try {
            const isCopyShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c";
            const isDeleteWordBefore = ((!e.metaKey && e.ctrlKey && e.key === "Backspace") || (!e.metaKey && e.altKey && e.key === "Backspace"));
            const isDeleteWordAfter = ((!e.metaKey && e.ctrlKey && e.key === "Delete") || (!e.metaKey && e.altKey && e.key === "Delete"));

            // Let browser paste shortcuts flow to the paste event handler.
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                return;
            }

            // Let browser copy shortcuts work when terminal text is selected.
            if (isCopyShortcut && this.hasTerminalSelection()) {
                return;
            }

            if (isDeleteWordBefore || isDeleteWordAfter) {
                e.preventDefault();
                if (isDeleteWordBefore) {
                    this.terminal.deleteWordBeforeCursor();
                } else {
                    this.terminal.deleteWordAfterCursor();
                }
                return;
            }

            // Ignore most modified shortcuts so we do not type their key glyphs.
            if (e.altKey || e.metaKey || (e.ctrlKey && !isCopyShortcut)) {
                return;
            }

            e.preventDefault();

            if (e.key === "Enter") {
                await this.terminal.submitCurrentInput();
            } else if (isCopyShortcut) {
                this.terminal.interrupt();
            } else if (e.key === "Backspace") {
                this.terminal.deleteInputBeforeCursor();
            } else if (e.key === "Delete") {
                this.terminal.deleteInputAtCursor();
            } else if (e.key === "ArrowLeft") {
                this.terminal.moveCursorLeft();
            } else if (e.key === "ArrowRight") {
                this.terminal.moveCursorRight();
            } else if (e.key === "Home") {
                this.terminal.moveCursorStart();
            } else if (e.key === "End") {
                this.terminal.moveCursorEnd();
            } else if (e.key === "ArrowUp") {
                this.terminal.scrollHistoryPrevious();
            } else if (e.key === "ArrowDown") {
                this.terminal.scrollHistoryNext();
            } else if (e.key.length === 1) {
                this.terminal.writeInputAtCursor(e.key);
            }
        } catch (error) {
            console.error('Keyboard handler error:', error);
        }
    }
}

/**
 * @class TextChannel
 * @description Async text channel used to stream data between pipeline stages
 */
class TextChannel {
    constructor(initialText = "") {
        this.queue = [];
        this.waiters = [];
        this.closed = false;
        this.bufferedText = "";
        this.closedPromise = new Promise((resolve) => {
            this.resolveClosed = resolve;
        });

        if (initialText.length > 0) {
            this.write(initialText);
        }
    }

    write(text = "") {
        if (this.closed || text.length === 0) {
            return;
        }

        this.bufferedText += text;
        if (this.waiters.length > 0) {
            const waiter = this.waiters.shift();
            waiter({ value: text, done: false });
            return;
        }

        this.queue.push(text);
    }

    close() {
        if (this.closed) {
            return;
        }

        this.closed = true;
        this.resolveClosed();
        while (this.waiters.length > 0) {
            const waiter = this.waiters.shift();
            waiter({ value: undefined, done: true });
        }
    }

    getBufferedText() {
        return this.bufferedText;
    }

    async readAll() {
        if (!this.closed) {
            await this.closedPromise;
        }
        return this.bufferedText;
    }

    async nextChunk() {
        if (this.queue.length > 0) {
            const value = this.queue.shift();
            return { value, done: false };
        }

        if (this.closed) {
            return { value: undefined, done: true };
        }

        return await new Promise((resolve) => {
            this.waiters.push(resolve);
        });
    }

    getStream() {
        const channel = this;
        return {
            [Symbol.asyncIterator]() {
                return {
                    next() {
                        return channel.nextChunk();
                    }
                };
            }
        };
    }
}

/**
 * @class Command
 * @description Represents a terminal command with metadata
 */
class Command {
    /**
     * @param {Function} func - The async function to execute
     */
    constructor(func) {
        this.func = func;
        this.summary = '';
        this.help = '';
        this.internal = false;
    }

    /**
     * Set the command function
     * @param {Function} func - The async function
     * @returns {Command} This instance for chaining
     */
    withFunc(func) {
        this.func = func;
        return this;
    }

    /**
     * Set the command summary
     * @param {string} summary - Short description
     * @returns {Command} This instance for chaining
     */
    withSummary(summary) {
        this.summary = summary;
        return this;
    }

    /**
     * Set the command help text
     * @param {string} help - Detailed help text
     * @returns {Command} This instance for chaining
     */
    withHelp(help) {
        this.help = help;
        return this;
    }

    /**
     * Mark command as internal
     * @returns {Command} This instance for chaining
     */
    markInternal() {
        this.internal = true;
        return this;
    }

    /**
     * Get the help text
     * @returns {string} The help text
     */
    getHelp() {
        return this.help;
    }

    /**
     * Get the summary text
     * @returns {string} The summary text
     */
    getSummary() {
        return this.summary;
    }

    /**
     * Check if command is internal
     * @returns {boolean} Whether the command is internal
     */
    isInternal() {
        return this.internal;
    }

    /**
     * Execute the command
     * @param {Object} cmd - The command output interface
     * @param {...any} args - Command arguments
     * @returns {Promise<number>} The exit code
     */
    async execute(cmd, ...args) {
        try {
            return await this.func(cmd, ...args);
        } catch (error) {
            console.error('Command execution error:', error);
            cmd.stdErr(`Error executing command: ${error.message}\n`);
            return 1;
        }
    }
}

/**
 * @class Terminal
 * @description Main terminal emulator class
 */
class Terminal {
    /**
     * @param {HTMLElement} terminalElement - The terminal DOM element
     */
    constructor(terminalElement) {
        this.renderer = new Renderer(terminalElement, 'lee.io\u00A0>\u00A0');
        this.inputBuffer = new InputBuffer();
        this.keyboardHandler = new KeyboardHandler(this);

        this.output = '';
        this.history = [];
        this.historyScrollPos = 0;
        this.historyLimit = 100;
        this.commands = {};
        this.variables = {};
        this.commandQueue = [];
        this.isExecutingCommand = false;
        this.lastExitCode = 0;
    }

    /**
     * Add a command to the terminal
     * @param {string} name - Command name
     * @param {Command} command - Command instance
     * @returns {Terminal} This instance for chaining
     */
    withCommand(name, command) {
        if (!this.commandExists(name)) {
            this.commands[name] = command;
        }
        return this;
    }

    /**
     * Check if a command exists
     * @param {string} name - Command name
     * @returns {boolean} Whether the command exists
     */
    commandExists(name) {
        return name in this.commands;
    }

    /**
     * Get a command by name
     * @param {string} name - Command name
     * @returns {Command|undefined} The command or undefined
     */
    getCommand(name) {
        return this.commands[name];
    }

    /**
     * Get all commands
     * @returns {Object} All commands
     */
    getCommands() {
        return this.commands;
    }

    /**
     * Write text at cursor position
     * @param {string} text - Text to write
     */
    writeInputAtCursor(text = '') {
        this.inputBuffer.write(text);
        this.render();
    }

    /**
     * Delete character before cursor
     */
    deleteInputBeforeCursor() {
        this.inputBuffer.deleteBeforeCursor();
        this.render();
    }

    /**
     * Delete character at cursor
     */
    deleteInputAtCursor() {
        this.inputBuffer.deleteAtCursor();
        this.render();
    }

    /**
     * Delete word before cursor
     */
    deleteWordBeforeCursor() {
        this.inputBuffer.deleteWordBeforeCursor();
        this.render();
    }

    /**
     * Delete word after cursor
     */
    deleteWordAfterCursor() {
        this.inputBuffer.deleteWordAfterCursor();
        this.render();
    }

    /**
     * Move cursor to start
     */
    moveCursorStart() {
        this.inputBuffer.cursorToStart();
        this.render();
    }

    /**
     * Move cursor to end
     */
    moveCursorEnd() {
        this.inputBuffer.cursorToEnd();
        this.render();
    }

    /**
     * Move cursor left
     */
    moveCursorLeft() {
        this.inputBuffer.cursorLeft();
        this.render();
    }

    /**
     * Move cursor right
     */
    moveCursorRight() {
        this.inputBuffer.cursorRight();
        this.render();
    }

    /**
     * Scroll history backward (up arrow)
     */
    scrollHistoryPrevious() {
        if (this.history.length > 0) {
            if (this.historyScrollPos < this.history.length) {
                this.historyScrollPos++;
            }
            this.inputBuffer.reset();
            this.inputBuffer.write(this.history[this.historyScrollPos - 1]);
            this.render();
        }
    }

    /**
     * Scroll history forward (down arrow)
     */
    scrollHistoryNext() {
        if (this.history.length > 0 && this.historyScrollPos > 0) {
            this.historyScrollPos--;
            this.inputBuffer.reset();
            if (this.historyScrollPos > 0) {
                this.inputBuffer.write(this.history[this.historyScrollPos - 1]);
            }
            this.render();
        }
    }

    /**
     * Reset history scroll position
     * @private
     */
    _resetHistoryScrollPos() {
        this.historyScrollPos = 0;
    }

    /**
     * Show the prompt
     */
    showPrompt(resetInput = true) {
        this._resetHistoryScrollPos();
        if (resetInput) {
            this.inputBuffer.reset();
        }
        this.render();
    }

    /**
     * Create the command output interface
     * @returns {Object} Object with stdOut and stdErr methods
     */
    createCommandOutput({ stdin = "", stdinReader = null, onStdOut = undefined, onStdErr = undefined } = {}) {
        const stdOutWriter = typeof onStdOut === "function"
            ? onStdOut
            : (text) => {
                this.output += text;
                this.renderer.renderOutput(this.output);
            };

        const stdErrWriter = typeof onStdErr === "function"
            ? onStdErr
            : (text) => {
                this.output += text;
                this.renderer.renderOutput(this.output);
            };

        const staticStream = {
            async *[Symbol.asyncIterator]() {
                if (stdin.length > 0) {
                    yield stdin;
                }
            }
        };

        const output = {
            stdOut: stdOutWriter,
            stdErr: stdErrWriter,
            readStdIn: async () => (stdinReader ? await stdinReader.readAll() : stdin),
            stdInStream: stdinReader ? stdinReader.getStream() : staticStream
        };

        Object.defineProperty(output, "stdIn", {
            enumerable: true,
            get: () => (stdinReader ? stdinReader.getBufferedText() : stdin)
        });

        return output;
    }

    /**
     * Expand built-in shell-like variables in raw input
     * @param {string} input - Raw command input
     * @returns {string} Input with variables expanded
     */
    expandVariables(input = "") {
        const withExitCode = input.replace(/\$\?/g, String(this.lastExitCode));
        return withExitCode.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, bracedName, simpleName) => {
            const name = bracedName || simpleName;
            return this.variables[name] ?? "";
        });
    }

    /**
     * Parse assignment token in NAME=value form
     * @param {string} token - Token to parse
     * @returns {{name: string, value: string}|undefined} Parsed assignment or undefined
     */
    parseAssignmentToken(token) {
        const match = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            return undefined;
        }

        return {
            name: match[1],
            value: match[2]
        };
    }

    /**
     * Parse pipelines while respecting simple quoting rules
     * @param {string} inputLine - Raw input line
     * @returns {string[]} Pipeline segments
     */
    parsePipeline(inputLine = "") {
        const segments = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;

        for (let i = 0; i < inputLine.length; i++) {
            const ch = inputLine[i];

            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                current += ch;
                continue;
            }

            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                current += ch;
                continue;
            }

            if (!inSingle && !inDouble && ch === "|") {
                segments.push(current.trim());
                current = "";
                continue;
            }

            current += ch;
        }

        segments.push(current.trim());
        return segments;
    }

    /**
     * Execute one command line without echoing the prompt
     * @param {string} inputLine - Command input
     * @returns {Promise<number>} Exit code
     */
    async executeSingleCommand(inputLine, {
        stdin = "",
        stdinReader = null,
        captureOutput = false,
        onStdOut = undefined,
        onStdErr = undefined
    } = {}) {
        const expandedInput = this.expandVariables(inputLine);
        const parts = expandedInput.trim().split(/\s+/).filter(Boolean);
        let stdOutBuffer = "";
        let stdErrBuffer = "";

        const stdOutWriter = (text) => {
            if (captureOutput) {
                stdOutBuffer += text;
            }

            if (typeof onStdOut === "function") {
                onStdOut(text);
                return;
            }

            if (!captureOutput) {
                this.output += text;
                this.renderer.renderOutput(this.output);
            }
        };

        const stdErrWriter = (text) => {
            if (captureOutput) {
                stdErrBuffer += text;
            }

            if (typeof onStdErr === "function") {
                onStdErr(text);
                return;
            }

            if (!captureOutput) {
                this.output += text;
                this.renderer.renderOutput(this.output);
            }
        };

        while (parts.length > 0) {
            const assignment = this.parseAssignmentToken(parts[0]);
            if (!assignment) {
                break;
            }

            this.variables[assignment.name] = assignment.value;
            parts.shift();
        }

        if (parts.length === 0) {
            return { exitCode: 0, stdout: stdOutBuffer, stderr: stdErrBuffer };
        }

        const commandName = parts.shift();
        if (this.commandExists(commandName)) {
            const command = this.getCommand(commandName);
            const exitCode = await command.execute(this.createCommandOutput({
                stdin,
                stdinReader,
                onStdOut: stdOutWriter,
                onStdErr: stdErrWriter
            }), ...parts);
            return { exitCode, stdout: stdOutBuffer, stderr: stdErrBuffer };
        }

        const errorText = `${commandName}: command not found\n`;
        stdErrWriter(errorText);

        return { exitCode: 127, stdout: stdOutBuffer, stderr: stdErrBuffer };
    }

    /**
     * Execute a full pipeline and flush only final stdout to terminal output
     * @param {string[]} segments - Pipeline command segments
     * @returns {Promise<number>} Exit code of last pipeline stage
     */
    async executePipeline(segments, { stdin = "", captureOutput = false } = {}) {
        const stageCount = segments.length;
        const channels = [];
        for (let i = 0; i < stageCount - 1; i++) {
            channels.push(new TextChannel());
        }

        let finalStdout = "";
        let combinedStderr = "";

        const finalStdOutWriter = (text) => {
            if (captureOutput) {
                finalStdout += text;
                return;
            }

            this.output += text;
            this.renderer.renderOutput(this.output);
        };

        const stdErrWriter = (text) => {
            if (captureOutput) {
                combinedStderr += text;
                return;
            }

            this.output += text;
            this.renderer.renderOutput(this.output);
        };

        const stagePromises = segments.map((segment, index) => {
            const stdinChannel = index > 0 ? channels[index - 1] : null;
            const stdoutChannel = index < stageCount - 1 ? channels[index] : null;

            const stageStdOutWriter = stdoutChannel
                ? (text) => stdoutChannel.write(text)
                : finalStdOutWriter;

            const stagePromise = this.executeSingleCommand(segment, {
                stdin: index === 0 ? stdin : "",
                stdinReader: stdinChannel,
                onStdOut: stageStdOutWriter,
                onStdErr: stdErrWriter,
                captureOutput
            });

            return stagePromise.finally(() => {
                if (stdoutChannel) {
                    stdoutChannel.close();
                }
            });
        });

        const results = await Promise.all(stagePromises);
        const lastResult = results[results.length - 1];
        return {
            exitCode: lastResult.exitCode,
            stdout: finalStdout,
            stderr: combinedStderr
        };
    }

    /**
     * Execute the current input as a command
     */
    async runCommandLine(inputLine, echoPrompt = true) {
        if (inputLine.length === 0) {
            this.lastExitCode = 0;
            return;
        }

        // Echo command only when it actually starts executing, unless it
        // was already displayed when queued while another command was running.
        if (echoPrompt) {
            this.output += this.renderer.promptPrefix + inputLine + "\n";
            this.renderer.renderOutput(this.output);
        }

        try {
            const pipelineSegments = this.parsePipeline(inputLine);
            const hasPipeline = pipelineSegments.length > 1;

            if (pipelineSegments.some((segment) => segment.length === 0)) {
                this.output += "Syntax error near unexpected token '|'\n";
                this.renderer.renderOutput(this.output);
                this.lastExitCode = 2;
                return;
            }

            if (hasPipeline) {
                const result = await this.executePipeline(pipelineSegments);
                this.lastExitCode = result.exitCode;
                return;
            }

            const result = await this.executeSingleCommand(inputLine);
            this.lastExitCode = result.exitCode;
        } catch (error) {
            console.error('Command execution error:', error);
            this.output += `Error: ${error.message}\n`;
            this.lastExitCode = 1;
            this.renderer.renderOutput(this.output);
        }
    }

    /**
     * Execute queued commands one at a time
     */
    async drainCommandQueue() {
        if (this.isExecutingCommand) {
            return;
        }

        this.isExecutingCommand = true;
        try {
            while (this.commandQueue.length > 0) {
                const queued = this.commandQueue.shift();
                await this.runCommandLine(queued.line, queued.echoPrompt);
            }
        } finally {
            this.isExecutingCommand = false;
            this.showPrompt(false);
        }
    }

    /**
     * Submit current input line and enqueue for execution
     */
    async submitCurrentInput() {
        const inputLine = this.inputBuffer.getContent();

        // Match shell behavior for empty Enter.
        if (inputLine.length === 0) {
            // While a command is running, ignore empty Enter to avoid
            // injecting visual blank lines.
            if (this.isExecutingCommand) {
                return;
            }

            // Commit an empty prompt line (not a bare newline) so the next
            // prompt appears on the immediate next line without extra spacing.
            this.output += this.renderer.promptPrefix + "\n";
            this._resetHistoryScrollPos();
            this.inputBuffer.reset();
            this.render();
            return;
        }

        if (this.history.length >= this.historyLimit) {
            this.history.pop();
        }
        this.history.unshift(inputLine);

        const queuedWhileExecuting = this.isExecutingCommand;
        if (queuedWhileExecuting) {
            // Preserve visibility of queued input without drawing a fake prompt.
            this.output += inputLine + "\n";
            this.renderer.renderOutput(this.output);
        }

        this.commandQueue.push({ line: inputLine, echoPrompt: true });

        this._resetHistoryScrollPos();
        this.inputBuffer.reset();

        // Keep cursor on the next line immediately after pressing Enter
        // without showing the next prompt before command output starts.
        this.render("");

        await this.drainCommandQueue();
    }

    /**
     * Handle Ctrl+C interrupt
     */
    interrupt() {
        const inputBuffer = this.inputBuffer.getContent();
        this.output += this.renderer.promptPrefix + inputBuffer + "\n";
        this.showPrompt(true);
    }

    /**
     * Get the active prompt prefix for rendering
     * @private
     * @param {string|undefined} override - Optional prompt override
     * @returns {string} Prompt prefix to render
     */
    _getPromptPrefix(override) {
        if (override !== undefined) {
            return override;
        }

        return this.isExecutingCommand ? "" : this.renderer.promptPrefix;
    }

    /**
     * Render the terminal
     */
    render(promptPrefixOverride = undefined) {
        const promptPrefix = this._getPromptPrefix(promptPrefixOverride);

        this.renderer.render(
            this.output,
            this.inputBuffer.getContent(),
            this.inputBuffer.getCursorX(),
            promptPrefix
        );
    }

    /**
     * Initialize internal commands
     */
    initializeInternalCommands() {
        this.withCommand("help", new Command(async (cmd, ...args) => {
            try {
                let showInternal = false;
                let name = undefined;

                for (const arg of args) {
                    if (arg === "-i" || arg === "--internal") {
                        showInternal = true;
                        continue;
                    }

                    if (name === undefined || name === "") {
                        name = arg;
                        continue;
                    }

                    cmd.stdErr("Usage: help [-i|--internal] [command]\n");
                    return 1;
                }

                if (name !== undefined && name !== "") {
                    if (!this.commandExists(name)) {
                        cmd.stdErr(`No help entry for '${name}'\n`);
                        return 1;
                    }
                    cmd.stdOut(this.getCommand(name).getHelp() + "\n");
                    return 0;
                }

                const commands = this.getCommands();
                let maxLength = 10;
                for (const commandName in commands) {
                    if (commandName.length > maxLength) {
                        maxLength = commandName.length;
                    }
                }

                let output = "Commands:\n";
                for (const commandName in commands) {
                    const command = this.getCommand(commandName);
                    if (!showInternal && command.isInternal()) {
                        continue;
                    }

                    const summary = command.getSummary();
                    const internalTag = command.isInternal() ? " [internal]" : "";
                    output += `\n${commandName.padEnd(maxLength, ' ')} : ${summary || "N/A"}${internalTag}`;
                }

                cmd.stdOut(output + "\n");
                return 0;
            } catch (error) {
                console.error('Help command error:', error);
                cmd.stdErr(`Error: ${error.message}\n`);
                return 1;
            }
        }).withSummary("Prints help page. Use 'help <command>' to display help for a command")
                    .withHelp("Shows all user-facing commands or detailed help for a specific command.\nUse -i or --internal to include internal commands in the list.\n\nUsage: help [-i|--internal] [command]"));

        this.withCommand("echo", new Command(async (cmd, ...args) => {
            const suppressNewline = args[0] === "-n";
            const textArgs = suppressNewline ? args.slice(1) : args;
            const output = textArgs.join(' ');
            cmd.stdOut(output + (suppressNewline ? '' : "\n"));
            return 0;
        }).withSummary("Displays a line of text")
            .withHelp("Prints its arguments to standard output.\n\nUsage: echo [-n] [text ...]")
            .markInternal());

        this.withCommand("cat", new Command(async (cmd, ...args) => {
            if (args.length > 0) {
                cmd.stdErr("cat: file arguments are not supported in this terminal\n");
                return 1;
            }

            cmd.stdOut(await cmd.readStdIn());
            return 0;
        }).withSummary("Passes stdin through to stdout")
            .withHelp("Writes piped stdin to standard output.\n\nUsage: cat")
            .markInternal());

        this.withCommand("date", new Command(async (cmd, ...args) => {
            const options = parseArg(args ? args.join(' ') : "");
            const now = new Date();
            cmd.stdOut((options.u === true || options.utc === true ? now.toUTCString() : now.toString()) + "\n");
            return 0;
        }).withSummary("Displays the current date and time")
            .withHelp("Prints the current date and time.\n\nUsage: date [-u|--utc]")
            .markInternal());

        this.withCommand("uname", new Command(async (cmd, ...args) => {
            const options = parseArg(args ? args.join(' ') : "");
            const platform = window.navigator.platform || "unknown";
            const appVersion = window.navigator.appVersion || "unknown";

            if (options.a === true) {
                cmd.stdOut(`lee.io ${platform} ${appVersion}\n`);
                return 0;
            }

            cmd.stdOut("lee.io\n");
            return 0;
        }).withSummary("Displays system information")
            .withHelp("Prints basic system information.\n\nUsage: uname [-a]")
            .markInternal());

        this.withCommand("which", new Command(async (cmd, ...args) => {
            if (args.length === 0) {
                cmd.stdErr("Usage: which <command> [command ...]\n");
                return 1;
            }

            let exitCode = 0;
            for (const name of args) {
                if (this.commandExists(name)) {
                    cmd.stdOut(`${name}\n`);
                } else {
                    cmd.stdErr(`${name} not found\n`);
                    exitCode = 1;
                }
            }

            return exitCode;
        }).withSummary("Locates a command")
            .withHelp("Displays whether a command exists in this terminal.\n\nUsage: which <command> [command ...]")
            .markInternal());

        this.withCommand("set", new Command(async (cmd) => {
            const variableNames = Object.keys(this.variables).sort();
            const output = variableNames.map((name) => `${name}=${this.variables[name]}`).join("\n");
            cmd.stdOut((output ? output + "\n" : ""));
            return 0;
        }).withSummary("Displays shell variables")
            .withHelp("Prints all shell variables.\n\nUsage: set")
            .markInternal());

        this.withCommand("unset", new Command(async (cmd, ...args) => {
                if (args.length === 0) {
                    cmd.stdErr("Usage: unset <name> [name ...]\n");
                    return 1;
                }

                for (const name of args) {
                    delete this.variables[name];
                }

                return 0;
        }).withSummary("Unsets shell variables")
            .withHelp("Removes one or more shell variables.\n\nUsage: unset <name> [name ...]")
            .markInternal());

        this.withCommand("history", new Command(async (cmd, ...args) => {
            try {
                const argsParsed = parseArg(args ? args.join(' ') : "");
                if (argsParsed.c === true) {
                    this.history = [];
                    return 0;
                }

                cmd.stdOut(this.history.slice().reverse().join("\n") + "\n");
                return 0;
            } catch (error) {
                console.error('History command error:', error);
                cmd.stdErr(`Error: ${error.message}\n`);
                return 1;
            }
        }).withSummary("Shows previously entered commands")
            .withHelp("Displays command history in chronological order.\nUse -c to clear the history.\n\nUsage: history [-c]")
            .markInternal());

        this.withCommand("time", new Command(async (cmd, ...args) => {
            if (args.length === 0) {
                cmd.stdErr("Usage: time <command> [args ...]\n");
                return 1;
            }

            const nestedLine = args.join(" ");
            const start = (typeof performance !== "undefined" && typeof performance.now === "function")
                ? performance.now()
                : Date.now();
            const pipelineSegments = this.parsePipeline(nestedLine);
            const stdinText = await cmd.readStdIn();
            const result = pipelineSegments.length > 1
                ? await this.executePipeline(pipelineSegments, { stdin: stdinText, captureOutput: true })
                : await this.executeSingleCommand(nestedLine, { stdin: stdinText, captureOutput: true });
            const end = (typeof performance !== "undefined" && typeof performance.now === "function")
                ? performance.now()
                : Date.now();
            const elapsedSeconds = (end - start) / 1000;

            if (result.stderr) {
                cmd.stdErr(result.stderr);
            }

            if (result.stdout) {
                cmd.stdOut(result.stdout);
            }

            cmd.stdOut(`real ${elapsedSeconds.toFixed(3)}s\n`);
            return result.exitCode;
        }).withSummary("Times command execution")
            .withHelp("Executes a command and prints elapsed wall-clock time.\n\nUsage: time <command> [args ...]")
            .markInternal());

        this.withCommand("clear", new Command(async () => {
            this.output = '';
            this.render();
            return 0;
        }).withSummary("Clears the terminal output")
            .withHelp("Clears all visible terminal output and redraws the prompt.\n\nUsage: clear")
            .markInternal());
    }

    /**
     * Start the terminal
     */
    run() {
        this.initializeInternalCommands();
        this.renderer.initialize();
        this.keyboardHandler.attach(this.renderer.getElement());
        this.renderer.focus();
        this.output = `Type 'help' for help\n`;
        this.showPrompt();
    }
}

/**
 * Parse command-line arguments
 * @param {string} argv - Arguments string
 * @returns {Object} Parsed arguments
 * @see {@link https://github.com/tnhu/arg}
 */
function parseArg(argv = "") {
    const result = {};
    let i = 0;
    let item = null;
    for (
        argv = argv.split(/\s*\B[\/-]+([\w-]+)[\s=]*/), i = 1;
        item = argv[i++];
        result[item] = argv[i++] || !0
    );
    return result;
}