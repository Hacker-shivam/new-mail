import transporter from "../config/mailer.js";
import ampTemplate from "../templates/ampTemplate.js";
import htmlTemplate from "../templates/htmlTemplate.js";
import AmpTemplate from "../models/AmpTemplate.js";
import Contact from "../models/Contact.js";
import Tracking from "../models/Tracking.js";
import {
  renderTrackedFormTemplate,
  renderTrackedTemplate
} from "../utils/generateAmpTemplate.js";
import { assertEmailIsSendable } from "./suppressionService.js";
import { generateTrackingId } from "../utils/tracking.js";
import { validateTemplate } from "../utils/templateValidator.js";

const getSavedTemplate = async ({ templateId, templateSlug }) => {
  console.log("EMAIL TEMPLATE LOOKUP:", {
    templateId: templateId || null,
    templateSlug: templateSlug || null
  });

  if (templateId) {
    return AmpTemplate.findOne({
      _id: templateId,
      isActive: true
    });
  }

  if (templateSlug) {
    return AmpTemplate.findOne({
      slug: templateSlug,
      isActive: true
    });
  }

  return null;
};

const getAuthenticatedSender = () => {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
};

const getMailFromAddress = (requestedSenderEmail) => {
  if (process.env.SMTP_ALLOW_CUSTOM_FROM === "true" && requestedSenderEmail) {
    return requestedSenderEmail;
  }

  return getAuthenticatedSender();
};

const shouldSendAmpPart = () => {
  return process.env.ENABLE_AMP_EMAIL === "true";
};

const sendTrackingEmail = async (
  userEmail,
  subject,
  campaignName,
  campaignType,
  options = {}
) => {
  try {
    console.log("EMAIL SEND START:", {
      to: userEmail,
      subject: subject || null,
      campaignName: campaignName || null,
      campaignType: campaignType || null,
      templateId: options.templateId || null,
      templateSlug: options.templateSlug || null,
      senderEmail: options.senderEmail || process.env.SMTP_FROM || process.env.SMTP_USER || null,
      skipVerify: Boolean(options.skipVerify)
    });

    console.log("EMAIL SUPPRESSION CHECK START:", {
      to: userEmail
    });

    await assertEmailIsSendable(userEmail);

    console.log("EMAIL SUPPRESSION CHECK OK:", {
      to: userEmail
    });

    const trackingId = generateTrackingId(userEmail, campaignName);
    console.log("EMAIL TRACKING ID CREATED:", {
      trackingId,
      to: userEmail
    });

    const savedTemplate = await getSavedTemplate(options);

    if ((options.templateId || options.templateSlug) && !savedTemplate) {
      console.error("EMAIL TEMPLATE LOOKUP FAILED:", {
        templateId: options.templateId || null,
        templateSlug: options.templateSlug || null
      });
      throw new Error("Template not found or inactive");
    }

    console.log("EMAIL TEMPLATE LOOKUP RESULT:", {
      found: Boolean(savedTemplate),
      templateId: savedTemplate?._id?.toString() || null,
      templateSlug: savedTemplate?.slug || null,
      templateName: savedTemplate?.name || null,
      hasHtml: Boolean(savedTemplate?.html),
      hasAmp: Boolean(savedTemplate?.amp),
      hasFormHtml: Boolean(savedTemplate?.formHtml)
    });

    if (savedTemplate) {
      const validation = validateTemplate({
        subject: subject || savedTemplate.subject,
        html: savedTemplate.html,
        amp: savedTemplate.amp,
        formHtml: savedTemplate.formHtml,
        variables: savedTemplate.variables,
        sourceJson: savedTemplate.sourceJson,
        providedVariables: {
          ...(options.variables || {}),
          email: userEmail,
          subject,
          campaignName,
          campaignType
        }
      });

      if (!validation.valid) {
        console.error("EMAIL TEMPLATE VALIDATION FAILED:", {
          templateId: savedTemplate?._id?.toString(),
          templateSlug: savedTemplate?.slug,
          errors: validation.errors,
          warnings: validation.warnings
        });
        throw new Error(`Template validation failed: ${validation.errors.map((issue) => issue.message).join("; ")}`);
      }

      console.log("EMAIL TEMPLATE VALIDATION OK:", {
        templateId: savedTemplate?._id?.toString(),
        templateSlug: savedTemplate?.slug,
        warningCount: validation.warnings.length
      });
    }

    console.log("EMAIL RENDER START:", {
      trackingId,
      usingSavedTemplate: Boolean(savedTemplate)
    });

    const renderedTemplate = savedTemplate
      ? renderTrackedTemplate({
          template: savedTemplate,
          trackingId,
          email: userEmail,
          subject,
          campaignName,
          campaignType,
          variables: options.variables
        })
      : null;
    const renderedFormHtml = savedTemplate?.formHtml
      ? renderTrackedFormTemplate({
          template: savedTemplate,
          trackingId,
          email: userEmail,
          subject,
          campaignName,
          campaignType,
          variables: options.variables
      })
      : "";

    console.log("EMAIL RENDER OK:", {
      trackingId,
      htmlLength: renderedTemplate?.html?.length || 0,
      ampLength: renderedTemplate?.amp?.length || 0,
      formHtmlLength: renderedFormHtml?.length || 0
    });

    // Verify SMTP connection unless a bulk worker is using the pooled transport.
    if (!options.skipVerify) {
      console.log("EMAIL SMTP VERIFY START:", {
        host: process.env.SMTP_HOST || null,
        port: process.env.SMTP_PORT || null,
        userSet: Boolean(process.env.SMTP_USER),
        from: getAuthenticatedSender() || null
      });

      await transporter.verify();
      console.log("EMAIL SMTP VERIFY OK");
    }

    const senderEmail = getMailFromAddress(options.senderEmail);

    if (!senderEmail) {
      throw new Error("Sender email is missing. Set SMTP_FROM or SMTP_USER.");
    }

    const replyTo = options.replyTo || options.replyToEmail || options.senderEmail || senderEmail;
    const fromName = process.env.SMTP_FROM_NAME || process.env.SENDER_NAME;
    const fromAddress = fromName
      ? `${fromName} <${senderEmail}>`
      : `<${senderEmail}>`;

    const amp = shouldSendAmpPart()
      ? savedTemplate
        ? renderedTemplate?.amp || undefined
        : ampTemplate(trackingId, subject, campaignName, campaignType)
      : undefined;

    const mailOptions = {
      from: fromAddress,

      to: userEmail,

      subject: renderedTemplate?.subject || subject,

      replyTo,

      text:
        renderedTemplate?.text ||
        "Your email client does not support HTML or AMP emails.",

      headers: {
        "X-Tracking-Id": trackingId
      },

      envelope: {
        from: senderEmail,
        to: userEmail
      },

      html:
        renderedTemplate?.html ||
        htmlTemplate(trackingId, subject, campaignName, campaignType),

      ...(amp ? { amp } : {})
    };

    console.log("EMAIL SMTP SEND START:", {
      trackingId,
      from: senderEmail || null,
      requestedSenderEmail: options.senderEmail || null,
      to: userEmail,
      replyTo: replyTo || null,
      subject: mailOptions.subject || null,
      hasHtml: Boolean(mailOptions.html),
      hasAmp: Boolean(mailOptions.amp),
      htmlLength: mailOptions.html?.length || 0,
      ampLength: mailOptions.amp?.length || 0
    });

    const info = await transporter.sendMail(mailOptions);

    console.log("EMAIL SMTP SEND OK:", {
      trackingId,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    });

    console.log("EMAIL TRACKING SAVE START:", {
      trackingId,
      messageId: info.messageId
    });

    await Tracking.create({
      trackingId,
      email: userEmail,
      subject: renderedTemplate?.subject || subject,
      campaignName,
      campaignType,
      templateId: savedTemplate?._id?.toString(),
      templateSlug: savedTemplate?.slug,
      templateName: savedTemplate?.name,
      renderedFormHtml,
      messageId: info.messageId,
      senderEmail,
      senderProvider: options.senderProvider || process.env.SENDER_PROVIDER || "smtp",
      deliveryProvider: options.deliveryProvider || process.env.DELIVERY_PROVIDER || "smtp",
      eventType: "sent",
      sentAt: new Date()
    });

    console.log("EMAIL TRACKING SAVE OK:", {
      trackingId,
      messageId: info.messageId
    });

    await Contact.findOneAndUpdate(
      {
        email: String(userEmail).trim().toLowerCase()
      },
      {
        $set: {
          lastActivityAt: new Date()
        }
      }
    );

    console.log("EMAIL SEND COMPLETE:", {
      trackingId,
      messageId: info.messageId,
      to: userEmail
    });

    return info;

  } catch (err) {
    console.error("EMAIL ERROR:", {
      to: userEmail,
      subject: subject || null,
      campaignName: campaignName || null,
      templateId: options.templateId || null,
      templateSlug: options.templateSlug || null,
      code: err?.code,
      command: err?.command,
      responseCode: err?.responseCode,
      response: err?.response,
      message: err?.message,
      stack: err?.stack
    });
    throw err;
  }
};

export default sendTrackingEmail;
