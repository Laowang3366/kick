package com.excel.forum.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

@Component
public class HtmlSanitizer {
    private final Safelist safelist;

    public HtmlSanitizer() {
        this.safelist = Safelist.relaxed()
                .addTags("table", "thead", "tbody", "tfoot", "tr", "th", "td", "span", "div", "pre", "code", "hr")
                .addAttributes(":all", "class", "style")
                .addAttributes("code", "data-code-block")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addProtocols("img", "src", "http", "https");
    }

    public String sanitize(String input) {
        if (input == null || input.isBlank()) {
            return input;
        }
        return Jsoup.clean(input, safelist);
    }
}
