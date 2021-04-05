module.exports = function() {
    this.historyScrollPos = 0;
    this.search = '';
    this.found = '';
    this.first = true;
    
    this.input = function(term, input) {
        var write = function(searchTerm, text) {
            term._clearLineWrite("(reverse-i-search)`"+searchTerm+"': ", text)
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
            case '\u0012':
                if (term.history.length > 0) {
                    if (this.historyScrollPos < term.history.length) {                        
                        this.historyScrollPos++;
                    }
                }
            default:                
                if (input.match(/^[a-zA-Z0-9]+$/)) {
                    this.search = this.search + input
                }

                for (var i = this.historyScrollPos; i < term.history.length; i++) {
                    if (term.history[i].match(this.search)) {
                        this.historyScrollPos = i;
                        this.found = term.history[this.historyScrollPos];
                        break;
                    }
                }

                write(this.search, this.found);
        }
    }
}