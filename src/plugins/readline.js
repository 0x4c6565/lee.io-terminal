module.exports = function() {
    this.historyScrollPos = 0;
    this.search = '';
    this.found = '';
    this.first = true;
    
    this.input = function(term, input) {
        var failed = false
        var write = function(searchTerm, text) {
            var prefix = "(reverse-i-search)"
            if (failed) {
                prefix = "(failed reverse-i-search)"
            }
            term._clearLineWrite(prefix+"`"+searchTerm+"': ", text)
        }

        if (this.first) {
            this.first = false;
            write("", term.inputBuffer)
            return false;
        }
        
        switch (input) {                
            case '\r':
            case '\u0003':
                return true;
            case '\u007F':
                if (this.search.length > 0) {
                    this.search = this.search.slice(0, -1);
                    this.historyScrollPos = 0;
                }
                break;
            case '\u0012':
                if (term.history.length > 0) {
                    if (this.historyScrollPos < term.history.length) {                        
                        this.historyScrollPos++;
                    }
                }
                break;
            default:
                if (input.match(/^[a-zA-Z0-9]+$/)) {
                    this.search = this.search + input
                    this.historyScrollPos = 0;
                }
        }
        
        failed = true
        for (var i = this.historyScrollPos; i < term.history.length; i++) {
            if (term.history[i].match(this.search)) {
                this.historyScrollPos = i;
                failed = false
                this.found = term.history[this.historyScrollPos];
                break;
            }
        }
        write(this.search, this.found);
    }
}