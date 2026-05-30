const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const escapeAttr = escapeHtml;

const px = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}px` : fallback;
};

const numberFrom = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return null;
};

const getImageSize = (props = {}) => {
  const width = numberFrom(props.width, props.naturalWidth, props.imageWidth) || 600;
  const height = numberFrom(
    props.height,
    props.naturalHeight,
    props.imageHeight,
    props.originalHeight
  );
  const ratio = numberFrom(props.aspectRatio);
  const source = String(props.src || props.imageUrl || "");
  const isLikelyPoster = /(?:whatsapp|poster|flyer|story|portrait|vertical)/i.test(source)
    || width < (height || 0);

  return {
    width,
    height: isLikelyPoster && (!height || height < width)
      ? Math.round(width * 1.69)
      : height || (ratio ? Math.round(width / ratio) : 1014)
  };
};

const getTheme = (sourceJson = {}) => ({
  width: sourceJson.theme?.width || 600,
  backgroundColor: sourceJson.theme?.backgroundColor || "#f8fafc",
  contentColor: sourceJson.theme?.contentColor || "#ffffff",
  darkBackgroundColor: sourceJson.theme?.darkBackgroundColor || sourceJson.theme?.darkMode?.backgroundColor || "#111827",
  darkContentColor: sourceJson.theme?.darkContentColor || sourceJson.theme?.darkMode?.contentColor || "#1f2937",
  darkTextColor: sourceJson.theme?.darkTextColor || sourceJson.theme?.darkMode?.textColor || "#f9fafb",
  darkMutedColor: sourceJson.theme?.darkMutedColor || sourceJson.theme?.darkMode?.mutedColor || "#cbd5e1",
  textColor: sourceJson.theme?.textColor || "#111827",
  mutedColor: sourceJson.theme?.mutedColor || "#64748b",
  primaryColor: sourceJson.theme?.primaryColor || "#178218",
  followDeviceColorScheme: sourceJson.theme?.followDeviceColorScheme !== false,
  fontFamily: sourceJson.theme?.fontFamily || "Arial, sans-serif"
});

const getBlocks = (sourceJson = {}) => {
  return Array.isArray(sourceJson.blocks) ? sourceJson.blocks : [];
};

const style = (values) => {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
};

const getVisibilityToken = (visibility) => {
  if (!visibility?.field) {
    return null;
  }

  const operator = visibility.operator || "truthy";
  const expected = visibility.value;

  if (operator === "equals" && expected !== undefined && expected !== "") {
    return `${visibility.field} == "${String(expected).replace(/"/g, "\\\"")}"`;
  }

  if (operator === "notEquals" && expected !== undefined && expected !== "") {
    return `${visibility.field} != "${String(expected).replace(/"/g, "\\\"")}"`;
  }

  return visibility.field;
};

const wrapWithVisibility = (html, block) => {
  const token = getVisibilityToken(block.props?.visibility || block.visibility);

  return token ? `{{#if ${token}}}${html}{{/if}}` : html;
};

const renderText = (block, theme, tag = "p") => {
  const props = block.props || {};
  const htmlTag = tag === "h1" || tag === "h2" || tag === "h3" ? tag : "p";
  const text = props.text || "";

  return `<${htmlTag} style="${style({
    margin: props.margin || "0 0 14px",
    color: props.color || theme.textColor,
    "font-family": theme.fontFamily,
    "font-size": px(props.fontSize, htmlTag === "p" ? "16px" : "24px"),
    "font-weight": props.fontWeight || (htmlTag === "p" ? "400" : "700"),
    "line-height": props.lineHeight || "1.45",
    "text-align": props.align || "left"
  })}">${text}</${htmlTag}>`;
};

const renderImageHtml = (block) => {
  const props = block.props || {};
  const padding = props.padding || "0";
  const margin = props.align === "right"
    ? "0 0 0 auto"
    : props.align === "left"
      ? "0"
      : "0 auto";
  const image = `<img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="100%" style="${style({
    display: "block",
    border: "0",
    width: "100%",
    "max-width": "100%",
    height: "auto",
    margin,
    "border-radius": px(props.radius, "0")
  })}" />`;

  return props.href
    ? `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:${padding}"><a href="${escapeAttr(props.href)}" target="_blank">${image}</a></td></tr></table>`
    : `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:${padding}">${image}</td></tr></table>`;
};

const renderImageAmp = (block) => {
  const props = block.props || {};
  const padding = props.padding || "0";
  const { width, height } = getImageSize(props);
  const textAlign = props.align === "right"
    ? "right"
    : props.align === "left"
      ? "left"
      : "center";
  const image = `<div style="padding:${padding};text-align:${textAlign}"><amp-img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="${width}" height="${height}" layout="responsive"></amp-img></div>`;

  return props.href
    ? `<a href="${escapeAttr(props.href)}" target="_blank">${image}</a>`
    : image;
};

const renderButton = (block, theme) => {
  const props = block.props || {};
  const text = escapeHtml(props.text || "Click");
  const href = escapeAttr(props.href || "{{formHtmlUrl}}");
  const backgroundColor = props.backgroundColor || theme.primaryColor;
  const color = props.color || "#ffffff";

  return `<table role="presentation" align="${props.align || "center"}" border="0" cellpadding="0" cellspacing="0" style="margin:${props.margin || "18px auto"}">
  <tr>
    <td align="center" bgcolor="${escapeAttr(backgroundColor)}" style="border-radius:${px(props.radius, "6px")}">
      <a href="${href}" target="_blank" style="${style({
        display: "inline-block",
        background: backgroundColor,
        color,
        "font-family": theme.fontFamily,
        "font-size": px(props.fontSize, "16px"),
        "font-weight": props.fontWeight || "700",
        "line-height": "1",
        "text-decoration": "none",
        padding: props.padding || "13px 20px",
        "border-radius": px(props.radius, "6px")
      })}">${text}</a>
    </td>
  </tr>
</table>`;
};

const renderDivider = (block) => {
  const props = block.props || {};
  return `<div style="${style({
    height: "1px",
    "line-height": "1px",
    background: props.color || "#e5e7eb",
    margin: props.margin || "20px 0"
  })}">&nbsp;</div>`;
};

const renderSpacer = (block) => {
  const props = block.props || {};
  return `<div style="height:${px(props.height, "20px")};line-height:${px(props.height, "20px")}">&nbsp;</div>`;
};

const renderShape = (block, theme) => {
  const props = block.props || {};
  const width = px(props.width, "100%");
  const height = px(props.height, "80px");
  const radius = props.shape === "circle" || props.shape === "pill"
    ? "999px"
    : px(props.radius, "8px");

  return `<div style="${style({
    width,
    height,
    margin: props.margin || "12px auto",
    background: props.shape === "line" ? "transparent" : (props.backgroundColor || theme.primaryColor),
    border: props.shape === "line"
      ? `${props.lineWidth || 2}px ${props.lineStyle || "solid"} ${props.backgroundColor || theme.primaryColor}`
      : (props.border || "0"),
    "border-radius": radius,
    "line-height": height
  })}">&nbsp;</div>`;
};

const renderCard = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    background: props.backgroundColor || "#f8fafc",
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "18px",
    margin: props.margin || "14px 0",
    "text-align": props.align || "left",
    "font-family": theme.fontFamily
  })}">
  ${props.title ? `<h3 style="${style({
    margin: "0 0 8px",
    color: props.titleColor || theme.textColor,
    "font-size": px(props.titleSize, "20px"),
    "line-height": "1.3"
  })}">${props.title}</h3>` : ""}
  ${props.text ? `<p style="${style({
    margin: "0",
    color: props.textColor || theme.mutedColor,
    "font-size": px(props.textSize, "15px"),
    "line-height": "1.5"
  })}">${props.text}</p>` : ""}
</div>`;
};

const renderRawHtml = (block) => {
  return block.props?.html || "";
};

const renderNavbar = (block, theme) => {
  const props = block.props || {};
  const links = props.links || [
    { label: "Home", href: "#" },
    { label: "About", href: "#" },
    { label: "Contact", href: "#" }
  ];

  return `<div style="${style({
    "font-family": theme.fontFamily,
    "text-align": props.align || "center",
    padding: props.padding || "12px 0"
  })}">
    ${links.map((link) => `<a href="${escapeAttr(link.href)}" style="${style({
      color: props.color || theme.primaryColor,
      "font-size": px(props.fontSize, "14px"),
      "font-weight": "700",
      "text-decoration": "none",
      margin: "0 10px"
    })}">${escapeHtml(link.label)}</a>`).join("")}
  </div>`;
};

const renderLogoHeader = (block, theme) => {
  const props = block.props || {};
  const logo = props.logoUrl
    ? `<img src="${escapeAttr(props.logoUrl)}" alt="${escapeAttr(props.logoAlt || "Logo")}" width="${Number(props.logoWidth) || 120}" style="display:block;margin:0 auto 10px;height:auto;max-width:100%">`
    : "";

  return `<div style="${style({
    "text-align": props.align || "center",
    padding: props.padding || "18px 0",
    "font-family": theme.fontFamily
  })}">
    ${logo}
    ${props.title ? `<h1 style="${style({
      margin: "0",
      color: props.color || theme.textColor,
      "font-size": px(props.fontSize, "26px")
    })}">${escapeHtml(props.title)}</h1>` : ""}
  </div>`;
};

const renderProductCard = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "18px",
    "font-family": theme.fontFamily,
    "text-align": props.align || "left"
  })}">
    ${props.imageUrl ? `<img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.title || "Product")}" style="display:block;width:100%;height:auto;border-radius:${px(props.radius, "8px")}">` : ""}
    <h3 style="margin:14px 0 6px;color:${props.titleColor || theme.textColor};font-size:${px(props.titleSize, "20px")}">${escapeHtml(props.title || "Product Name")}</h3>
    <p style="margin:0 0 12px;color:${props.textColor || theme.mutedColor};font-size:${px(props.textSize, "14px")}">${escapeHtml(props.text || "Product description")}</p>
    ${props.price ? `<p style="margin:0 0 12px;font-weight:700;color:${theme.textColor};font-size:18px">${escapeHtml(props.price)}</p>` : ""}
    ${renderButton({ props: { text: props.buttonText || "View Product", href: props.href || "#", backgroundColor: props.buttonColor || theme.primaryColor } }, theme)}
  </div>`;
};

const renderProductList = (block, theme) => {
  const props = block.props || {};
  const collection = props.collection || "products";
  const fallbackItems = props.items || [
    {
      title: "Product name",
      text: "Short product description.",
      price: "$29",
      href: "https://example.com/product"
    }
  ];
  const fallbackHtml = fallbackItems
    .map((item) => renderProductCard({
      props: {
        ...props,
        ...item
      }
    }, theme))
    .join("\n");

  const repeatedCard = renderProductCard({
    props: {
      ...props,
      imageUrl: "{{imageUrl}}",
      title: "{{title | default:'Product name'}}",
      text: "{{text | default:'Short product description.'}}",
      price: "{{price}}",
      href: "{{href | default:'#'}}",
      buttonText: "{{buttonText | default:'View Product'}}"
    }
  }, theme);

  return `{{#each ${collection}}}${repeatedCard}{{/each}}{{#unless ${collection}}}${fallbackHtml}{{/unless}}`;
};

const normalizeOptions = (options, fallback) => {
  const values = Array.isArray(options) && options.length ? options : fallback;

  return values.map((option) => {
    if (typeof option === "object") {
      return {
        label: option.label || option.value,
        value: option.value || option.label
      };
    }

    return {
      label: option,
      value: option
    };
  });
};

const toFormBlock = (block, fields, defaults = {}) => {
  return {
    ...block,
    type: "form",
    props: {
      ...defaults,
      ...(block.props || {}),
      fields
    }
  };
};

const renderPoll = (block, theme, target) => {
  const props = block.props || {};
  const options = normalizeOptions(
    props.options,
    ["Yes", "No", "Maybe"]
  );
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.name || "pollAnswer",
        label: props.question || "What do you think?",
        type: "radio",
        required: true,
        options
      }
    ],
    {
      title: props.title || "Quick poll",
      description: props.description || props.question,
      submitText: props.submitText || "Vote"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderSurvey = (block, theme, target) => {
  const props = block.props || {};
  const questions = Array.isArray(props.questions) && props.questions.length
    ? props.questions
    : [
        {
          name: "surveyAnswer",
          label: props.question || "How was your experience?",
          type: "select",
          required: true,
          options: ["Excellent", "Good", "Average", "Poor"]
        }
      ];
  const fields = questions.map((question, index) => ({
    name: question.name || `question${index + 1}`,
    label: question.label || question.question || `Question ${index + 1}`,
    type: question.type || "select",
    required: question.required !== false,
    options: normalizeOptions(question.options, ["Yes", "No"])
  }));
  const formBlock = toFormBlock(block, fields, {
    title: props.title || "Survey",
    description: props.description,
    submitText: props.submitText || "Submit survey"
  });

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderRating = (block, theme, target) => {
  const props = block.props || {};
  const max = Math.min(Math.max(Number(props.max) || 5, 2), 10);
  const options = Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    return {
      label: props.labelPrefix ? `${props.labelPrefix} ${value}` : String(value),
      value
    };
  });
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.name || "rating",
        label: props.question || "How would you rate us?",
        type: "radio",
        required: true,
        options
      },
      ...(props.allowComment === false
        ? []
        : [
            {
              name: props.commentName || "comment",
              label: props.commentLabel || "Anything else to share?",
              type: "textarea"
            }
          ])
    ],
    {
      title: props.title || "Rate your experience",
      description: props.description,
      submitText: props.submitText || "Submit rating"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderNps = (block, theme, target) => {
  const props = block.props || {};
  const options = Array.from({ length: 11 }, (_, value) => ({
    label: String(value),
    value
  }));
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.name || "npsScore",
        label: props.question || "How likely are you to recommend us?",
        type: "radio",
        required: true,
        options
      },
      {
        name: props.reasonName || "npsReason",
        label: props.reasonLabel || "What is the main reason for your score?",
        type: "textarea"
      }
    ],
    {
      title: props.title || "Quick NPS",
      description: props.description || "0 means not likely, 10 means very likely.",
      submitText: props.submitText || "Send feedback"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderAppointment = (block, theme, target) => {
  const props = block.props || {};
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.dateName || "appointmentDate",
        label: props.dateLabel || "Preferred date",
        type: "date",
        required: true
      },
      {
        name: props.timeName || "appointmentTime",
        label: props.timeLabel || "Preferred time",
        type: "select",
        required: true,
        options: normalizeOptions(
          props.slots,
          ["10:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"]
        )
      },
      {
        name: props.phoneName || "phone",
        label: props.phoneLabel || "Phone number",
        type: "tel"
      }
    ],
    {
      title: props.title || "Book an appointment",
      description: props.description,
      submitText: props.submitText || "Book slot"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderRsvp = (block, theme, target) => {
  const props = block.props || {};
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.name || "rsvp",
        label: props.question || "Will you attend?",
        type: "radio",
        required: true,
        options: normalizeOptions(props.options, ["Yes", "Maybe", "No"])
      },
      {
        name: props.guestName || "guestCount",
        label: props.guestLabel || "Number of guests",
        type: "number"
      }
    ],
    {
      title: props.title || "Event RSVP",
      description: props.description,
      submitText: props.submitText || "Send RSVP"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderConditionalGroup = (block, target, theme) => {
  const props = block.props || {};
  const token = getVisibilityToken(props.visibility || block.visibility);
  const children = Array.isArray(props.blocks) ? props.blocks : [];
  const content = children
    .map((childBlock) => renderBlock(childBlock, target, theme))
    .join("\n");

  return token ? `{{#if ${token}}}${content}{{/if}}` : content;
};

const renderPricingCard = (block, theme) => {
  const props = block.props || {};
  const features = props.features || ["Feature one", "Feature two", "Feature three"];

  return `<div style="${style({
    border: props.border || `2px solid ${theme.primaryColor}`,
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "22px",
    "text-align": "center",
    "font-family": theme.fontFamily
  })}">
    <h3 style="margin:0;color:${theme.textColor};font-size:22px">${escapeHtml(props.title || "Pro Plan")}</h3>
    <p style="margin:12px 0;font-size:32px;font-weight:700;color:${theme.primaryColor}">${escapeHtml(props.price || "$29")}</p>
    <div style="text-align:left;margin:16px 0">${features.map((feature) => `<p style="margin:8px 0;color:${theme.mutedColor}">✓ ${escapeHtml(feature)}</p>`).join("")}</div>
    ${renderButton({ props: { text: props.buttonText || "Choose Plan", href: props.href || "#", backgroundColor: props.buttonColor || theme.primaryColor } }, theme)}
  </div>`;
};

const renderTestimonial = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    background: props.backgroundColor || "#f8fafc",
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "20px",
    "font-family": theme.fontFamily
  })}">
    <p style="margin:0 0 12px;color:${props.textColor || theme.textColor};font-size:16px;line-height:1.5">“${escapeHtml(props.quote || "This was a great experience.")}”</p>
    <p style="margin:0;font-weight:700;color:${theme.textColor}">${escapeHtml(props.name || "Customer Name")}</p>
    <p style="margin:2px 0 0;color:${theme.mutedColor};font-size:13px">${escapeHtml(props.role || "Customer")}</p>
  </div>`;
};

const renderCountdown = (block, theme) => {
  const props = block.props || {};
  const label = props.label || "Offer ends soon";
  const date = props.date || "2026-12-31";

  return `<div style="${style({
    "text-align": "center",
    padding: props.padding || "18px",
    background: props.backgroundColor || "#fef2f2",
    "border-radius": px(props.radius, "8px"),
    "font-family": theme.fontFamily
  })}">
    <p style="margin:0 0 8px;font-weight:700;color:${theme.textColor}">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:24px;font-weight:700;color:${props.color || "#dc2626"}">${escapeHtml(date)}</p>
  </div>`;
};

const renderAccordion = (block, theme) => {
  const props = block.props || {};
  const items = props.items || [
    { title: "Question one", text: "Answer text goes here." },
    { title: "Question two", text: "Answer text goes here." }
  ];

  return `<div style="font-family:${theme.fontFamily}">
    ${items.map((item) => `<div style="${style({
      border: "1px solid #e5e7eb",
      "border-radius": "6px",
      padding: "12px",
      margin: "8px 0"
    })}">
      <p style="margin:0 0 6px;font-weight:700;color:${theme.textColor}">${escapeHtml(item.title)}</p>
      <p style="margin:0;color:${theme.mutedColor};font-size:14px">${escapeHtml(item.text)}</p>
    </div>`).join("")}
  </div>`;
};

const renderCarousel = (block, theme) => {
  const props = block.props || {};
  const slides = props.slides || [
    { imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+1", title: "Slide 1" },
    { imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+2", title: "Slide 2" }
  ];

  if (props.amp === true) {
    return `<amp-carousel width="${Number(props.width) || 600}" height="${Number(props.height) || 260}" layout="responsive" type="slides">
      ${slides.map((slide) => `<div>
        <amp-img src="${escapeAttr(slide.imageUrl)}" alt="${escapeAttr(slide.title)}" width="${Number(props.width) || 600}" height="${Number(props.height) || 260}" layout="responsive"></amp-img>
      </div>`).join("")}
    </amp-carousel>`;
  }

  return `<div style="font-family:${theme.fontFamily};text-align:center">
    ${slides.slice(0, 3).map((slide) => `<div style="margin:10px 0">
      <img src="${escapeAttr(slide.imageUrl)}" alt="${escapeAttr(slide.title)}" style="display:block;width:100%;height:auto;border-radius:8px">
      <p style="margin:8px 0 0;font-weight:700;color:${theme.textColor}">${escapeHtml(slide.title)}</p>
    </div>`).join("")}
  </div>`;
};

const renderHtmlFormButton = (block, theme) => {
  return renderButton({
    props: {
      text: block.props?.submitText || block.props?.buttonText || "Open Form",
      href: "{{formHtmlUrl}}",
      backgroundColor: block.props?.backgroundColor,
      color: block.props?.color
    }
  }, theme);
};

const renderFields = (fields = [], amp = false) => {
  return fields.map((field) => {
    const name = escapeAttr(field.name);
    const label = escapeHtml(field.label || field.name);
    const required = field.required ? " required" : "";
    const commonStyle = "width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:12px;font-size:15px";

    if (field.type === "textarea") {
      return `<label style="display:block;margin:14px 0 6px;font-weight:700">${label}${field.required ? " *" : ""}</label><textarea name="${name}"${required} style="${commonStyle};min-height:90px"></textarea>`;
    }

    if (field.type === "select" && Array.isArray(field.options)) {
      const options = field.options
        .map((option) => `<option value="${escapeAttr(option.value || option)}">${escapeHtml(option.label || option)}</option>`)
        .join("");
      return `<label style="display:block;margin:14px 0 6px;font-weight:700">${label}${field.required ? " *" : ""}</label><select name="${name}"${required} style="${commonStyle}">${options}</select>`;
    }

    if ((field.type === "radio" || field.type === "checkbox") && Array.isArray(field.options)) {
      const type = field.type;
      const options = field.options
        .map((option) => {
          const optionValue = escapeAttr(option.value || option);
          const optionLabel = escapeHtml(option.label || option);
          return `<label style="display:block;margin:8px 0;font-weight:400"><input type="${type}" name="${name}" value="${optionValue}"${required}> ${optionLabel}</label>`;
        })
        .join("");

      return `<div style="margin:14px 0 6px;font-weight:700">${label}${field.required ? " *" : ""}</div>${options}`;
    }

    const type = ["email", "tel", "number", "date"].includes(field.type) ? field.type : "text";
    return `<label style="display:block;margin:14px 0 6px;font-weight:700">${label}${field.required ? " *" : ""}</label><input type="${type}" name="${name}" placeholder="${escapeAttr(field.placeholder || "")}"${required} style="${commonStyle}">`;
  }).join("");
};

const renderAmpForm = (block, theme) => {
  const props = block.props || {};
  const fields = renderFields(props.fields || [], true);
  const actionUrl = props.actionXhr || props.formAmpUrl || "https://example.com/amp-form-submit";

  return `<form method="post" action-xhr="${escapeAttr(actionUrl)}" style="${style({
    border: `1px solid ${props.borderColor || "#e5e7eb"}`,
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "20px",
    "font-family": theme.fontFamily,
    color: theme.textColor
  })}">
  ${props.title ? `<h2 style="margin:0 0 8px">${escapeHtml(props.title)}</h2>` : ""}
  ${props.description ? `<p style="margin:0 0 14px;color:${theme.mutedColor}">${escapeHtml(props.description)}</p>` : ""}
  ${fields}
  <button type="submit" style="${style({
    width: "100%",
    margin: "18px 0 0",
    border: "0",
    "border-radius": px(props.buttonRadius, "6px"),
    background: props.backgroundColor || theme.primaryColor,
    color: props.color || "#ffffff",
    padding: "13px",
    "font-size": "16px",
    "font-weight": "700"
  })}">${escapeHtml(props.submitText || "Submit")}</button>
  <div submit-success><template type="amp-mustache"><p style="color:${theme.primaryColor};text-align:center;font-weight:700">Submitted successfully.</p></template></div>
  <div submit-error><template type="amp-mustache"><p style="color:#dc2626;text-align:center;font-weight:700">Submission failed.</p></template></div>
</form>`;
};

const renderFormPageForm = (block, theme) => {
  const props = block.props || {};
  return `<form method="post" action-xhr="{{formActionUrl}}" target="_top" style="${style({
    margin: "0 auto",
    "max-width": "560px",
    background: theme.contentColor,
    border: "1px solid #e5e7eb",
    "border-radius": "8px",
    padding: "24px",
    "font-family": theme.fontFamily,
    color: theme.textColor
  })}">
  ${props.title ? `<h1 style="margin:0 0 8px;font-size:24px">${escapeHtml(props.title)}</h1>` : ""}
  ${props.description ? `<p style="margin:0 0 16px;color:${theme.mutedColor}">${escapeHtml(props.description)}</p>` : ""}
  ${renderFields(props.fields || [])}
  <button type="submit" style="${style({
    width: "100%",
    margin: "20px 0 0",
    border: "0",
    "border-radius": "6px",
    background: props.backgroundColor || theme.primaryColor,
    color: props.color || "#ffffff",
    padding: "13px",
    "font-size": "16px",
    "font-weight": "700"
  })}">${escapeHtml(props.submitText || "Submit")}</button>
  <div submit-success>
    <template type="amp-mustache">
      <p style="color:${props.backgroundColor || theme.primaryColor};text-align:center;font-weight:700">Submitted successfully.</p>
    </template>
  </div>
  <div submit-error>
    <template type="amp-mustache">
      <p style="color:#dc2626;text-align:center;font-weight:700">Submission failed. Please try again.</p>
    </template>
  </div>
</form>`;
};

const renderFooter = (theme) => {
  return `<div style="${style({
    "font-family": theme.fontFamily,
    "font-size": "12px",
    color: "#6b7280",
    "text-align": "center",
    margin: "20px 0 0"
  })}"><a href="{{unsubscribeUrl}}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a></div>`;
};

const renderBlockInner = (block, target, theme) => {
  switch (block.type) {
    case "heading":
      return renderText(block, theme, block.props?.level || "h2");
    case "text":
      return renderText(block, theme, "p");
    case "image":
      return target === "amp" ? renderImageAmp(block) : renderImageHtml(block);
    case "button":
      return renderButton(block, theme);
    case "form":
      if (target === "html") {
        return renderHtmlFormButton(block, theme);
      }
      if (target === "amp") {
        return renderAmpForm(block, theme);
      }
      return renderFormPageForm(block, theme);
    case "divider":
      return renderDivider(block);
    case "spacer":
      return renderSpacer(block);
    case "shape":
      return renderShape(block, theme);
    case "card":
      return renderCard(block, theme);
    case "rawHtml":
      return renderRawHtml(block);
    case "navbar":
      return renderNavbar(block, theme);
    case "logoHeader":
      return renderLogoHeader(block, theme);
    case "productCard":
      return renderProductCard(block, theme);
    case "productList":
      return renderProductList(block, theme);
    case "pricingCard":
      return renderPricingCard(block, theme);
    case "testimonial":
      return renderTestimonial(block, theme);
    case "countdown":
      return renderCountdown(block, theme);
    case "rating":
      return renderRating(block, theme, target);
    case "nps":
      return renderNps(block, theme, target);
    case "poll":
      return renderPoll(block, theme, target);
    case "survey":
      return renderSurvey(block, theme, target);
    case "appointment":
    case "booking":
      return renderAppointment(block, theme, target);
    case "quiz":
      return renderSurvey({
        ...block,
        props: {
          title: "Quiz",
          submitText: "Submit answers",
          ...(block.props || {})
        }
      }, theme, target);
    case "productFeedback":
      return renderRating({
        ...block,
        props: {
          title: "Product feedback",
          question: "How satisfied are you with this product?",
          ...(block.props || {})
        }
      }, theme, target);
    case "rsvp":
      return renderRsvp(block, theme, target);
    case "conditionalGroup":
      return renderConditionalGroup(block, target, theme);
    case "accordion":
      return renderAccordion(block, theme);
    case "carousel":
      return renderCarousel({
        ...block,
        props: {
          ...(block.props || {}),
          amp: target === "amp"
        }
      }, theme);
    case "footer":
      return renderFooter(theme);
    default:
      return "";
  }
};

const renderBlock = (block, target, theme) => {
  return wrapWithVisibility(renderBlockInner(block, target, theme), block);
};

const renderBody = (sourceJson, target) => {
  const theme = getTheme(sourceJson);
  return getBlocks(sourceJson)
    .map((block) => renderBlock(block, target, theme))
    .join("\n");
};

const hasBlockType = (sourceJson, types) => {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return getBlocks(sourceJson).some((block) => typeSet.has(block.type));
};

const colorSchemeMeta = (theme) => {
  return theme.followDeviceColorScheme
    ? `<meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">`
    : `<meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">`;
};

const htmlDeviceColorStyles = (theme) => {
  if (!theme.followDeviceColorScheme) {
    return "";
  }

  return `<style>
    :root{color-scheme:light dark;supported-color-schemes:light dark}
    @media (prefers-color-scheme: dark) {
      body,.email-bg{background:${theme.darkBackgroundColor} !important}
      .email-shell,.email-content{background:${theme.darkContentColor} !important}
      .email-content{color:${theme.darkTextColor} !important}
      .email-muted{color:${theme.darkMutedColor} !important}
    }
  </style>`;
};

const ampDeviceColorStyles = (theme) => {
  return "";
};

const interactiveBlockTypes = new Set([
  "form",
  "poll",
  "survey",
  "rating",
  "nps",
  "appointment",
  "booking",
  "quiz",
  "productFeedback",
  "rsvp"
]);

const htmlDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const body = renderBody(sourceJson, "html");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${colorSchemeMeta(theme)}
  <title>${escapeHtml(sourceJson.subject || sourceJson.name || "Email")}</title>
  ${htmlDeviceColorStyles(theme)}
</head>
<body class="email-bg" style="margin:0;padding:0;background:${theme.backgroundColor}">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent">{{preheader}}</div>
  <table class="email-bg" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${theme.backgroundColor}">
    <tr>
      <td align="center" style="padding:0">
        <table class="email-shell" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:none;background:${theme.contentColor}">
          <tr>
            <td class="email-content" style="padding:0;color:${theme.textColor}">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const ampDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const body = renderBody(sourceJson, "amp");
  const carouselScript = hasBlockType(sourceJson, "carousel")
    ? '<script async custom-element="amp-carousel" src="https://cdn.ampproject.org/v0/amp-carousel-0.2.js"></script>'
    : "";

  return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  ${colorSchemeMeta(theme)}
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  ${carouselScript}
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp4email-boilerplate>body{visibility:hidden}</style>
  <style amp-custom>
    body{margin:0;background:${theme.backgroundColor};font-family:${theme.fontFamily};color:${theme.textColor}}
    .email-shell{width:100%;max-width:none;margin:0 auto;background:${theme.contentColor};padding:0}
    .email-content{color:${theme.textColor}}
    a{color:${theme.primaryColor}}
    ${ampDeviceColorStyles(theme)}
  </style>
</head>
<body class="email-bg">
  <div class="email-shell email-content">
    ${body}
  </div>
</body>
</html>`;
};

const formDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const formBlock = getBlocks(sourceJson).find((block) => interactiveBlockTypes.has(block.type));
  const body = formBlock
    ? renderBlock(formBlock, "formPage", theme)
    : `<p style="font-family:${theme.fontFamily};text-align:center">No form block is available.</p>`;

  return `<!doctype html>
<html ⚡>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  ${colorSchemeMeta(theme)}
  <link rel="canonical" href="{{directFormHtmlUrl}}">
  <title>${escapeHtml(sourceJson.formTitle || sourceJson.name || "Form")}</title>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    body{margin:0;background:${theme.backgroundColor};padding:24px;font-family:${theme.fontFamily};color:${theme.textColor}}
    input,textarea,select{font-family:${theme.fontFamily}}
    ${ampDeviceColorStyles(theme)}
  </style>
</head>
<body class="email-bg email-content">
  ${body}
</body>
</html>`;
};

const placeholderPattern = /\{\{\s*(?![#/])([a-zA-Z0-9_.-]+)(?:\s*\|\s*default\s*:\s*(?:"[^"]*"|'[^']*'|[^}]+))?\s*\}\}/g;
const sectionPattern = /\{\{\s*#(?:if|unless|each)\s+([a-zA-Z0-9_.-]+)/g;

const extractVariables = (...templates) => {
  const variables = new Set();

  for (const template of templates) {
    if (!template) {
      continue;
    }

    for (const match of String(template).matchAll(placeholderPattern)) {
      variables.add(match[1]);
    }

    for (const match of String(template).matchAll(sectionPattern)) {
      variables.add(match[1]);
    }
  }

  return [...variables].sort();
};

const getTextFallback = (sourceJson) => {
  return getBlocks(sourceJson)
    .filter((block) => block.type === "heading" || block.type === "text")
    .map((block) => block.props?.text || "")
    .join("\n\n") || "Please view this email in HTML.";
};

export const compileTemplateSource = (sourceJson = {}) => {
  const html = htmlDocument(sourceJson);
  const amp = ampDocument(sourceJson);
  const formHtml = formDocument(sourceJson);
  const text = sourceJson.text || getTextFallback(sourceJson);

  return {
    html,
    amp,
    formHtml,
    text,
    variables: extractVariables(html, amp, formHtml, text, sourceJson.subject)
  };
};

export const builderBlockCatalog = [
  {
    type: "heading",
    label: "Heading",
    category: "content",
    block: {
      type: "heading",
      props: {
        text: "Section heading",
        level: "h2",
        fontSize: 24
      }
    }
  },
  {
    type: "text",
    label: "Text",
    category: "content",
    block: {
      type: "text",
      props: {
        text: "Write your email copy here."
      }
    }
  },
  {
    type: "image",
    label: "Image",
    category: "content",
    block: {
      type: "image",
      props: {
        src: "https://via.placeholder.com/600x320.png?text=Image",
        alt: "Image",
        width: 600,
        height: 320
      }
    }
  },
  {
    type: "button",
    label: "Button",
    category: "content",
    block: {
      type: "button",
      props: {
        text: "Call to action",
        href: "https://example.com"
      }
    }
  },
  {
    type: "form",
    label: "Form",
    category: "interactive",
    block: {
      type: "form",
      props: {
        title: "Tell us about yourself",
        submitText: "Submit",
        fields: [
          {
            name: "name",
            label: "Name",
            type: "text",
            required: true
          },
          {
            name: "email",
            label: "Email",
            type: "email",
            required: true
          }
        ]
      }
    }
  },
  {
    type: "poll",
    label: "Poll",
    category: "interactive",
    block: {
      type: "poll",
      props: {
        question: "Are you interested?",
        options: ["Yes", "No", "Maybe"]
      }
    }
  },
  {
    type: "survey",
    label: "Survey",
    category: "interactive",
    block: {
      type: "survey",
      props: {
        title: "Quick survey",
        questions: [
          {
            name: "experience",
            label: "How was your experience?",
            type: "select",
            options: ["Excellent", "Good", "Average", "Poor"]
          }
        ]
      }
    }
  },
  {
    type: "rating",
    label: "Rating",
    category: "interactive",
    block: {
      type: "rating",
      props: {
        question: "How would you rate us?",
        max: 5
      }
    }
  },
  {
    type: "nps",
    label: "NPS",
    category: "interactive",
    block: {
      type: "nps",
      props: {
        question: "How likely are you to recommend us?"
      }
    }
  },
  {
    type: "appointment",
    label: "Appointment",
    category: "interactive",
    block: {
      type: "appointment",
      props: {
        title: "Book an appointment",
        slots: ["10:00 AM", "12:00 PM", "03:00 PM"]
      }
    }
  },
  {
    type: "rsvp",
    label: "Event RSVP",
    category: "interactive",
    block: {
      type: "rsvp",
      props: {
        question: "Will you attend?"
      }
    }
  },
  {
    type: "carousel",
    label: "Carousel",
    category: "commerce",
    block: {
      type: "carousel",
      props: {
        slides: [
          {
            imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+1",
            title: "Slide 1"
          },
          {
            imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+2",
            title: "Slide 2"
          }
        ]
      }
    }
  },
  {
    type: "productCard",
    label: "Product Card",
    category: "commerce",
    block: {
      type: "productCard",
      props: {
        title: "Product name",
        text: "Short product description.",
        price: "$29",
        href: "https://example.com/product"
      }
    }
  },
  {
    type: "productList",
    label: "Dynamic Product List",
    category: "commerce",
    block: {
      type: "productList",
      props: {
        collection: "products",
        items: [
          {
            title: "Product name",
            text: "Short product description.",
            price: "$29",
            href: "https://example.com/product"
          }
        ]
      }
    }
  },
  {
    type: "conditionalGroup",
    label: "Conditional Section",
    category: "personalization",
    block: {
      type: "conditionalGroup",
      props: {
        visibility: {
          field: "plan",
          operator: "equals",
          value: "pro"
        },
        blocks: [
          {
            type: "text",
            props: {
              text: "This message is shown only to matching contacts."
            }
          }
        ]
      }
    }
  }
];

export const builderEditorConfig = {
  previewModes: [
    {
      id: "desktop",
      label: "Desktop",
      width: 600
    },
    {
      id: "mobile",
      label: "Mobile",
      width: 390
    }
  ],
  previewTargets: ["html", "amp", "formHtml", "text"],
  variableGroups: [
    {
      label: "Contact",
      variables: ["email", "firstName", "lastName", "phone", "company", "plan"]
    },
    {
      label: "Campaign",
      variables: ["subject", "campaignName", "campaignType"]
    },
    {
      label: "System",
      variables: ["unsubscribeUrl", "formHtmlUrl", "directFormHtmlUrl"]
    }
  ],
  visibilityOperators: [
    {
      value: "truthy",
      label: "exists"
    },
    {
      value: "equals",
      label: "equals"
    },
    {
      value: "notEquals",
      label: "does not equal"
    }
  ],
  personalizationExamples: [
    "{{firstName | default:'there'}}",
    "{{#if plan == \"pro\"}}Pro-only content{{/if}}",
    "{{#each products}}{{title}} - {{price}}{{/each}}"
  ]
};

export const starterTemplateSource = {
  version: 1,
  name: "Lead Form Template",
  subject: "Hi {{email}}, check your eligibility",
  theme: {
    width: 600,
    backgroundColor: "#f8fafc",
    contentColor: "#ffffff",
    darkBackgroundColor: "#111827",
    darkContentColor: "#1f2937",
    darkTextColor: "#f9fafb",
    darkMutedColor: "#cbd5e1",
    followDeviceColorScheme: true,
    primaryColor: "#178218",
    textColor: "#111827",
    mutedColor: "#64748b",
    fontFamily: "Arial, sans-serif"
  },
  blocks: [
    {
      id: "heading-1",
      type: "heading",
      props: {
        text: "Check Your Eligibility",
        level: "h1",
        align: "center",
        fontSize: 28
      }
    },
    {
      id: "text-1",
      type: "text",
      props: {
        text: "Hi {{email}}, submit your details and our team will contact you.",
        align: "center",
        color: "#475569"
      }
    },
    {
      id: "form-1",
      type: "form",
      props: {
        title: "Business Details",
        description: "Please submit your company and contact details.",
        submitText: "Apply Now",
        fields: [
          {
            name: "company",
            label: "Company Name",
            type: "text",
            required: true
          },
          {
            name: "mobile",
            label: "Mobile No",
            type: "tel",
            required: true
          },
          {
            name: "city",
            label: "City",
            type: "text"
          }
        ]
      }
    },
    {
      id: "footer-1",
      type: "footer",
      props: {
        unsubscribe: true
      }
    }
  ]
};
