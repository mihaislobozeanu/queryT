/**
 * Created by mihai on 2015.07.08.
 */

(function () {
    const queryT = {
        tokens: {
            start: '[[',
            end: ']]',
            separators: [',', 'AND', 'OR']
        }
    }, _globals = (function () {
        return this || (0, eval)("this");
    }());

    if (typeof module !== "undefined" && module.exports) {
        module.exports = queryT;
    } else if (typeof define === "function" && define.amd) {
        define(function () {
            return queryT;
        });
    } else {
        _globals.queryT = queryT;
    }

    function escapeToken(token) {
        let index = 0,
            escaped = "";
        while (index < token.length) {
            escaped += "\\" + token[index++];
        }
        return escaped;
    }

    function getSeparatorsExpression(separators) {
        return separators.map(function (s) {
            return escapeToken(s);
        }).join('|');
    };

    queryT.template = function (template, options) {

        options = options || {};

        const tokens = options.tokens || this.tokens,
            separatorsRe = new RegExp('^(' + getSeparatorsExpression(tokens.separators) + ')', 'gi'),
            parametersRe = /\@([^\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\^\`\{\|\}\[\]\-\~\s\']+)/g;

        if (typeof options.rewriteParameter !== "function") {
            options.rewriteParameter = function (name, index) {
                return name;
            };
        }

        if (typeof options.hasParameter !== "function") {
            options.hasParameter = function (name) {
            };
        }

        function replace(str, tokens, fn) {
            const tokensRe = new RegExp(escapeToken(tokens.start) + '|' + escapeToken(tokens.end), 'g');
            let match, result = '',
                startIndex = 0, endIndex = 0,
                depth = 0;
            while (match = tokensRe.exec(str)) {
                if (depth === 0) {
                    startIndex = match.index;
                    result += str.substring(endIndex, startIndex);
                }
                match[0] === tokens.start && depth++;
                match[0] === tokens.end && depth--;

                if (depth === 0) {
                    endIndex = match.index + tokens.end.length;
                    result += fn(str.substring(startIndex, endIndex));
                }
            }
            result += str.substring(endIndex);
            return result;
        }

        function stripOriginal(str) {
            const start = tokens.start.length,
                length = str.length - tokens.end.length - start;
            return str.substr(start, length);
        }

        function replaceOriginal(str) {
            let matched = false,
                previousMatched = false,
                matchesFound = 0;
            const result = replace(str, tokens, function (match) {
                matchesFound++;
                const response = matchParameters(replaceOriginal(stripOriginal(match)));

                if (!response.matched) {
                    return '';
                }
                match = response.result;
                if (previousMatched === false) {
                    match = trimSeparators(match);
                }
                matched = true;
                previousMatched = true;
                return match;
            });
            return {
                matched: matchesFound === 0 || matched,
                result: result
            };
        }

        function trimSeparators(str) {
            return str.replace(separatorsRe, function (match) {
                return '';
            }).trim();
        }

        function matchParameters(request) {
            const matches = request.result.match(parametersRe);
            let allMatches = 0,
                resolvedMatches = 0;
            if (matches && matches.length) {
                matches.forEach(function (match) {
                    allMatches++;
                    if (options.hasParameter(match) === true) {
                        resolvedMatches++;
                    }
                });
                return {
                    matched: (resolvedMatches === allMatches),
                    result: request.result
                }
            }
            return request;
        }

        function rewriteParameters(str) {
            let parameterIndex = 0;
            return str.replace(parametersRe, function (match) {
                return options.rewriteParameter(match, parameterIndex++);
            });
        }

        const response = replaceOriginal(template);
        return rewriteParameters(response.result);
    }

}());
