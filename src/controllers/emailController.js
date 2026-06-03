import sendTrackingEmail
from "../services/emailService.js";
import { SuppressedEmailError } from "../services/suppressionService.js";
import {
  createBulkEmailCampaign,
  getBulkEmailCampaign,
  pauseBulkEmailCampaign,
  resumeBulkEmailCampaign
} from "../services/bulkEmailService.js";
import { resolveRecipients } from "../services/contactService.js";
import {
  importRecipientsFromSource,
  previewRecipientImport,
  saveImportedRecipientsToContacts
} from "../services/recipientImportService.js";

export const sendEmailController =
async (req, res) => {

   try {

      const {
         email,
         subject,
         campaignName,
         campaignType,
         templateId,
         templateSlug,
         variables,
         senderEmail,
         replyTo,
         replyToEmail
      } = req.body;

      console.log("SEND EMAIL REQUEST:", {
         email: email || null,
         subject: subject || null,
         campaignName: campaignName || null,
         campaignType: campaignType || null,
         templateId: templateId || null,
         templateSlug: templateSlug || null,
         senderEmail: senderEmail || null,
         replyTo: replyTo || replyToEmail || null,
         variableKeys: variables ? Object.keys(variables) : []
      });

      if (!email) {

         return res.status(400).json({
            success: false,
            message: "Email is required"
         });

      }

      await sendTrackingEmail(
         email,
         subject,
         campaignName,
         campaignType,
         {
            templateId,
            templateSlug,
            variables,
            senderEmail,
            replyTo: replyTo || replyToEmail
         }
      );

      console.log("SEND EMAIL RESPONSE OK:", {
         email,
         templateId: templateId || null,
         templateSlug: templateSlug || null
      });

      res.json({
         success: true,
         message: "Tracking email sent"
      });

   } catch (error) {

      console.error("SEND EMAIL CONTROLLER ERROR:", {
         code: error?.code,
         message: error?.message,
         responseCode: error?.responseCode,
         response: error?.response,
         stack: error?.stack
      });

      if (error instanceof SuppressedEmailError || error?.code === "EMAIL_SUPPRESSED") {
         return res.status(200).json({
            success: true,
            skipped: true,
            message: "Email not sent because recipient is unsubscribed or suppressed"
         });
      }

      res.status(500).json({
         success: false,
         error: error.message
      });

   }

};

export const createBulkEmailController = async (req, res) => {
  try {
    const {
      recipients,
      emails,
      listId,
      segment,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail,
      replyTo,
      replyToEmail,
      scheduledAt
    } = req.body;

    console.log("BULK EMAIL CREATE REQUEST:", {
      recipientsCount: Array.isArray(recipients) ? recipients.length : 0,
      emailsCount: Array.isArray(emails) ? emails.length : 0,
      listId: listId || null,
      hasSegment: Boolean(segment),
      subject: subject || null,
      campaignName: campaignName || null,
      campaignType: campaignType || null,
      templateId: templateId || null,
      templateSlug: templateSlug || null,
      senderEmail: senderEmail || null,
      scheduledAt: scheduledAt || null
    });

    const resolvedRecipients = await resolveRecipients({
      recipients,
      emails,
      listId,
      segment
    });

    console.log("BULK EMAIL RECIPIENTS RESOLVED:", {
      count: resolvedRecipients.length
    });

    const campaign = await createBulkEmailCampaign({
      recipients: resolvedRecipients,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail,
      replyTo: replyTo || replyToEmail,
      scheduledAt
    });

    return res.status(201).json({
      success: true,
      message: "Bulk email campaign queued",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL CREATE ERROR:", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const previewBulkEmailImportController = async (req, res) => {
  try {
    const preview = await previewRecipientImport(
      req.body || {},
      Number(req.query.limit) || 25
    );

    return res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error("BULK EMAIL IMPORT PREVIEW ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const createBulkEmailImportController = async (req, res) => {
  try {
    const {
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail,
      replyTo,
      replyToEmail,
      scheduledAt,
      saveContacts,
      listId,
      saveListId,
      listName,
      tags
    } = req.body;

    console.log("BULK EMAIL IMPORT SEND REQUEST:", {
      subject: subject || null,
      campaignName: campaignName || null,
      campaignType: campaignType || null,
      templateId: templateId || null,
      templateSlug: templateSlug || null,
      senderEmail: senderEmail || null,
      scheduledAt: scheduledAt || null,
      saveContacts: Boolean(saveContacts),
      listId: listId || null,
      sourceKeys: Object.keys(req.body || {})
    });

    const importResult = await importRecipientsFromSource(req.body || {});

    console.log("BULK EMAIL IMPORT RESULT:", {
      source: importResult.source,
      recipients: importResult.recipients.length,
      failed: importResult.failed,
      duplicates: importResult.duplicates
    });

    if (!importResult.recipients.length) {
      return res.status(400).json({
        success: false,
        message: "No valid recipients found",
        importResult
      });
    }

    const savedContacts = saveContacts
      ? await saveImportedRecipientsToContacts({
        recipients: importResult.recipients,
        listId: saveListId || listId,
        listName,
        tags,
        source: importResult.source
      })
      : null;

    const campaign = await createBulkEmailCampaign({
      recipients: importResult.recipients,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail,
      replyTo: replyTo || replyToEmail,
      scheduledAt
    });

    return res.status(201).json({
      success: true,
      message: "Imported recipients and queued bulk email campaign",
      campaign,
      importSummary: {
        source: importResult.source,
        imported: importResult.recipients.length,
        failed: importResult.failed,
        duplicates: importResult.duplicates,
        savedContacts
      }
    });
  } catch (error) {
    console.error("BULK EMAIL IMPORT SEND ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getBulkEmailController = async (req, res) => {
  try {
    const result = await getBulkEmailCampaign(req.params.id);

    if (!result.campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("BULK EMAIL GET ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const pauseBulkEmailController = async (req, res) => {
  try {
    const campaign = await pauseBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      message: "Bulk email campaign paused",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL PAUSE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const resumeBulkEmailController = async (req, res) => {
  try {
    const campaign = await resumeBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      message: "Bulk email campaign resumed",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL RESUME ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const thankYou = async (req, res) => {

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Thank You</title>

      <style>
        body{
          font-family:Arial;
          display:flex;
          justify-content:center;
          align-items:center;
          height:100vh;
          background:#f8fafc;
          margin:0;
        }

        .box{
          background:white;
          padding:40px;
          border-radius:16px;
          text-align:center;
          box-shadow:0 4px 20px rgba(0,0,0,0.1);
        }

        h1{
          color:#178218;
        }
      </style>
    </head>

    <body>

      <div class="box">

        <h1>Thank You!</h1>

        <p>Your form has been submitted successfully.</p>

      </div>

    </body>
    </html>
  `);

}
