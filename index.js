/**
 * Created by mihai on 8/7/2015.
 */

(function () {
    var queryT = {
        tokens: {
            start: '[[',
            end: ']]',
            alternative: {
                start: '{{',
                end: '}}'
            },
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
        var index = 0,
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
        var options = options || {},
            tokens = options.tokens || this.tokens,
            originalRe = new RegExp(escapeToken(tokens.start) + "([\\s\\S]+?)" + escapeToken(tokens.end), 'g'),
            alternativeRe = new RegExp(escapeToken(tokens.alternative.start) + "([\\s\\S]+?)" + escapeToken(tokens.alternative.end), 'g'),
            alternateRe = new RegExp(escapeToken(tokens.start) + '|' + escapeToken(tokens.end), 'g'),
            separatorsRe = new RegExp('^(' + getSeparatorsExpression(tokens.separators) + ')', 'gi'),
            parametersRe = /\@([^\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\^\`\{\|\}\-\~\s\']+)/g;
        template = alternate(template, tokens);

        if (typeof options.rewriteParameter !== "function") {
            options.rewriteParameter = function (name, index) {
                return name;
            };
        }

        if (typeof options.hasParameter !== "function") {
            options.hasParameter = function (name) {
            };
        }

        function alternate(template) {
            var depth = 0;

            return template.replace(alternateRe, function (match) {
                if (match === tokens.start) {
                    if (depth % 2 === 1) {
                        match = tokens.alternative.start;
                    }
                    depth++;
                } else if (match === tokens.end) {
                    depth--;
                    if (depth % 2 === 1) {
                        match = tokens.alternative.end;
                    }
                }
                return match;
            });
        }

        function stripOriginal(str) {
            var start = tokens.start.length,
                length = str.length - tokens.end.length - start;
            return str.substr(start, length);
        }

        function stripAlternative(str) {
            var start = tokens.alternative.start.length,
                length = str.length - tokens.alternative.end.length - start;
            return str.substr(start, length);
        }

        function replaceOriginal(str) {
            var matched = false,
                previousMatched = false,
                matchesFound = 0,
                result = str.replace(originalRe, function (match) {
                    matchesFound++;
                    match = stripOriginal(match);
                    var response = replaceAlternative(match),
                        matchedParameters;

                    match = response.result;
                    matchedParameters = matchParameters(match);
                    if ((matchedParameters === -1) || (matchedParameters === 0 && !response.matched)) {
                        return '';
                    }
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

        function replaceAlternative(str) {
            var matched = false,
                previousMatched = false,
                matchesFound = 0,
                result = str.replace(alternativeRe, function (match) {
                    matchesFound++;
                    match = stripAlternative(match);
                    var response = replaceOriginal(match),
                        matchedParameters;

                    match = response.result;
                    matchedParameters = matchParameters(match);
                    if ((matchedParameters === -1) || (matchedParameters === 0 && !response.matched)) {
                        return '';
                    }
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

        function matchParameters(str) {
            var allMatches = 0,
                resolvedMatches = 0,
                matches = str.match(parametersRe);
            if (matches && matches.length) {
                matches.forEach(function (match) {
                    allMatches++;
                    if (options.hasParameter(match) === true) {
                        resolvedMatches++;
                    }
                });
            }
            return (resolvedMatches === allMatches) ? allMatches : -1;
        }

        function rewriteParameters(str) {
            var parameterIndex = 0;
            return str.replace(parametersRe, function (match) {
                return options.rewriteParameter(match, parameterIndex++);
            });
        }

        var response = replaceOriginal(template);
        return rewriteParameters(response.result);
    }

}());
