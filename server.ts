import express from 'express';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import twilio from 'twilio';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3000;

const SERVICE_DURATIONS: Record<string, number> = {
  'mot': 45,
  'inspection': 120,
  'full-service': 120,
  'deep-service': 180,
  'oil': 90,
  'repairs': 60,
  'ac': 45,
  'assessment': 10
};

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2023-10-16' as any }) : null;

app.use(express.json());

// API: Health Check
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: 11-Month Reminders (Manual Trigger)
app.post('/api/admin/run-reminders', async (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (adminPassword && providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = await sendElevenMonthReminders();
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Chatbot Endpoint (Exclusively Connected to Retell AI Agent)
// Removed custom chat endpoint as we are now using the official Retell Widget

// Helper: Get First Name
function getFirstName(fullName: string) {
  if (!fullName) return 'Customer';
  return fullName.trim().split(' ')[0];
}

// Helper: Send 11-Month Reminder Email
async function sendReminderEmail(booking: any) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) return;

  const firstName = getFirstName(booking.customer_name);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });

  const mailOptions = {
    from: `"The MOT Garage" <${emailUser}>`,
    to: booking.customer_email,
    subject: `Reminder: Your MOT/Service is due soon`,
    text: `Hi ${firstName}, It's been 11 months since your ${booking.service_name} with The MOT Garage. Like to book a new appointment? https://www.motgaragenailsworth.co.uk/`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="color: #1a1a1a;">Time for your MOT/Service?</h2>
        <p>Hi ${firstName},</p>
        <p>It's been 11 months since your last <strong>${booking.service_name}</strong> with us at The MOT Garage.</p>
        <p>To keep your vehicle in top condition and ensure you stay road-legal, we recommend booking your next appointment soon.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://www.motgaragenailsworth.co.uk/" style="background-color: #FF5A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Book Online Now</a>
        </div>
        <p>We look forward to seeing you again!</p>
        <p>Best regards,<br/>The MOT Garage Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

// Helper: Send 11-Month Reminder SMS
async function sendReminderSms(booking: any) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) return;

  const firstName = getFirstName(booking.customer_name);
  const client = twilio(accountSid, authToken);
  let phone = booking.customer_phone.replace(/\s+/g, '');
  if (phone.startsWith('07')) {
    phone = '+44' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    return;
  }

  return client.messages.create({
    body: `Hi ${firstName}, It's been 11 months since your MOT/Service with The MOT Garage. Like to book a new appointment? https://www.motgaragenailsworth.co.uk/`,
    from: twilioPhone,
    to: phone
  });
}

// Helper: Run 11-Month Reminders
async function sendElevenMonthReminders() {
  if (!supabase) return { message: 'Supabase not configured' };

  const elevenMonthsAgo = new Date();
  elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
  
  const startOfDay = new Date(elevenMonthsAgo);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(elevenMonthsAgo);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`Running 11-month reminders for date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('appointment_time', startOfDay.toISOString())
    .lte('appointment_time', endOfDay.toISOString())
    .eq('status', 'confirmed');

  if (error) throw error;
  if (!bookings || bookings.length === 0) return { message: 'No bookings found for this date' };

  let sentCount = 0;
  for (const booking of bookings) {
    // Check if reminder already sent (we'll use a metadata field if column doesn't exist)
    if (booking.reminder_sent) continue;

    try {
      await sendReminderEmail(booking);
      await sendReminderSms(booking);
      
      await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', booking.id);
      
      sentCount++;
    } catch (err) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, err);
    }
  }

  return { message: `Sent ${sentCount} reminders`, totalFound: bookings.length };
}

// Helper: Get Service Duration
function getServiceDuration(bookingDetails: any): number {
  // 1. Hardcoded check for MOT - This is the highest priority
  const serviceId = (bookingDetails.service_id || '').toLowerCase();
  const serviceName = (bookingDetails.service_name || '').toLowerCase();
  
  if (serviceId === 'mot' || serviceName.includes('mot')) {
    return 45;
  }

  // 2. Check if duration is explicitly provided
  if (bookingDetails.duration && Number(bookingDetails.duration) > 0) {
    return Number(bookingDetails.duration);
  }

  // 3. Check by service_id
  if (SERVICE_DURATIONS[serviceId]) {
    return SERVICE_DURATIONS[serviceId];
  }

  // 4. Check by service_name (fallback)
  if (serviceName.includes('inspection')) return 120;
  if (serviceName.includes('full service')) return 120;
  if (serviceName.includes('deep service')) return 180;
  if (serviceName.includes('oil service')) return 90;
  if (serviceName.includes('repair')) return 60;
  if (serviceName.includes('ac') || serviceName.includes('conditioning')) return 45;
  if (serviceName.includes('assessment')) return 10;

  // 5. Default to 60 minutes
  return 60;
}

// Helper: Send Email Notification
async function sendEmailNotification(bookingDetails: any) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log('Email credentials not configured, skipping email notification.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Generate ICS file content
    const startDate = new Date(bookingDetails.appointment_time);
    const durationMins = getServiceDuration(bookingDetails);
    const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000); 
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The MOT Garage//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${bookingDetails.id || new Date().getTime()}@themotgarage.co.uk`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `ORGANIZER;CN="The MOT Garage":mailto:${emailUser}`,
      `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN="${bookingDetails.customer_name}":mailto:${bookingDetails.customer_email}`,
      `SUMMARY:${bookingDetails.service_name} - ${bookingDetails.vehicle_reg}`,
      `DESCRIPTION:Customer: ${bookingDetails.customer_name}\\nPhone: ${bookingDetails.customer_phone}\\nEmail: ${bookingDetails.customer_email}\\nVehicle: ${bookingDetails.vehicle_make || ''} (${bookingDetails.vehicle_reg})`,
      'LOCATION:Days Mill\\, Old Market\\, Nailsworth\\, GL6 0DU',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Format date and time for display
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' };
    
    const displayDate = startDate.toLocaleDateString('en-GB', dateOptions);
    const displayTime = startDate.toLocaleTimeString('en-GB', timeOptions).toLowerCase().replace(' ', '');
    const displayDateTime = `${displayDate} at ${displayTime}`;
    const firstName = getFirstName(bookingDetails.customer_name);

    // 1. Send Confirmation Email to Customer (Send this first)
    const customerMailOptions = {
      from: `"The MOT Garage" <${emailUser}>`,
      to: bookingDetails.customer_email,
      replyTo: emailUser,
      subject: `Booking Confirmation: ${bookingDetails.service_name}`,
      text: `Hi ${firstName}, your booking for ${bookingDetails.service_name} on ${displayDateTime} is confirmed at The MOT Garage. Vehicle: ${bookingDetails.vehicle_make || ''} (${bookingDetails.vehicle_reg}).`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">Booking Confirmed!</h2>
          <p>Hi ${firstName},</p>
          <p>Your booking for a <strong>${bookingDetails.service_name}</strong> has been successfully confirmed.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${displayDateTime}</p>
            <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${bookingDetails.vehicle_make || ''} (${bookingDetails.vehicle_reg})</p>
          </div>
          
          <p>We look forward to seeing you at The MOT Garage!</p>
          <p><strong>Address:</strong> Days Mill, Old Market, Nailsworth, GL6 0DU</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">If you need to cancel or reschedule, please reply to this email or call us directly.</p>
        </div>
      `,
      icalEvent: {
        filename: 'booking.ics',
        method: 'request',
        content: icsContent
      }
    };

    // 2. Send Email to Garage Owner (kav@solere.co)
    const adminMailOptions = {
      from: `"The MOT Garage" <${emailUser}>`,
      to: emailUser,
      subject: `New Booking: ${bookingDetails.service_name} - ${bookingDetails.vehicle_reg}`,
      text: `New booking from ${bookingDetails.customer_name} for ${bookingDetails.service_name} on ${displayDateTime}.`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #1a1a1a;">New Booking Received</h2>
          <p><strong>Customer:</strong> ${bookingDetails.customer_name}</p>
          <p><strong>Phone:</strong> ${bookingDetails.customer_phone}</p>
          <p><strong>Email:</strong> ${bookingDetails.customer_email}</p>
          <p><strong>Service:</strong> ${bookingDetails.service_name}</p>
          <p><strong>Date & Time:</strong> ${displayDateTime}</p>
          <p><strong>Vehicle Reg:</strong> ${bookingDetails.vehicle_reg}</p>
          <p><strong>Make/Model:</strong> ${bookingDetails.vehicle_make || 'Not provided'}</p>
          <p><strong>Deposit Paid:</strong> £${bookingDetails.deposit_amount}</p>
        </div>
      `,
      icalEvent: {
        filename: 'booking.ics',
        method: 'request',
        content: icsContent
      }
    };

    console.log(`Attempting to send emails for booking ${bookingDetails.id || 'new'}...`);
    
    // Send Customer Email FIRST
    try {
      console.log(`Sending confirmation email to customer: ${bookingDetails.customer_email}`);
      const customerResult = await transporter.sendMail(customerMailOptions);
      console.log('Customer email sent successfully:', customerResult.messageId);
    } catch (customerError) {
      console.error(`CRITICAL: Failed to send customer email to ${bookingDetails.customer_email}:`, customerError);
    }

    // Send Admin Email SECOND
    try {
      const adminResult = await transporter.sendMail(adminMailOptions);
      console.log('Admin email sent successfully:', adminResult.messageId);
    } catch (adminError) {
      console.error('Failed to send admin email:', adminError);
    }
    
    console.log('Email notification process completed');
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
}

// Helper: Add to Google Calendar
async function addToGoogleCalendar(bookingDetails: any) {
  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  
  // Use the provided calendar ID if it's a secondary calendar, otherwise fallback to EMAIL_USER or primary
  let calendarId = process.env.GOOGLE_CALENDAR_ID || process.env.EMAIL_USER || 'primary';

  if (!credentialsBase64) {
    console.log('Google Calendar credentials not configured, skipping calendar event.');
    return;
  }

  try {
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const startTime = new Date(bookingDetails.appointment_time);
    const durationMins = getServiceDuration(bookingDetails);
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000); 

    console.log(`Creating calendar event: ${bookingDetails.service_name} at ${startTime.toISOString()} for ${durationMins} mins (ends ${endTime.toISOString()})`);

    const event = {
      summary: `${bookingDetails.service_name} - ${bookingDetails.vehicle_reg}`,
      location: 'Days Mill, Old Market, Nailsworth, GL6 0DU',
      description: `
        Customer: ${bookingDetails.customer_name}
        Phone: ${bookingDetails.customer_phone}
        Email: ${bookingDetails.customer_email}
        Vehicle: ${bookingDetails.vehicle_make} (${bookingDetails.vehicle_reg})
        Duration: ${durationMins} minutes
      `,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/London',
      },
    };

    const result = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });
    console.log(`Event added to Google Calendar: ${calendarId}. Event ID: ${result.data.id}`);
  } catch (error) {
    console.error('Failed to add to Google Calendar:', error);
  }
}

// Helper: Send SMS Notification via Twilio
async function sendSmsNotification(bookingDetails: any) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    console.log('Twilio credentials not configured, skipping SMS notification.');
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    
    // Format UK Mobile Number to E.164 (+447...)
    let phone = bookingDetails.customer_phone.replace(/\s+/g, '');
    if (phone.startsWith('07')) {
      phone = '+44' + phone.substring(1);
    } else {
      console.log('Phone number does not start with 07, skipping SMS.');
      return;
    }

    const appointmentDate = new Date(bookingDetails.appointment_time);
    const displayDate = appointmentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });
    const displayTime = appointmentDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).toLowerCase().replace(' ', '');
    const firstName = getFirstName(bookingDetails.customer_name);

    const message = await client.messages.create({
      body: `Hi ${firstName}, your booking for ${bookingDetails.service_name} on ${displayDate} at ${displayTime} is confirmed! - The MOT Garage`,
      from: twilioPhone,
      to: phone
    });

    console.log('SMS notification sent successfully:', message.sid);
  } catch (error) {
    console.error('Failed to send SMS notification:', error);
  }
}

// API: Create Retell Web Call
app.post('/api/create-web-call', async (req, res) => {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    return res.status(500).json({ error: 'Retell API keys are not configured' });
  }

  try {
    const response = await axios.post(
      'https://api.retellai.com/v2/create-web-call',
      { agent_id: agentId },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Retell API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create web call' });
  }
});

// API: Get Vehicle Details from DVLA
app.get('/api/vehicle/:reg', async (req, res) => {
  const reg = (req.params.reg || '').replace(/\s+/g, '').toUpperCase();
  // Support both standard env var naming and the exact header name the user entered
  const dvlaApiKey = process.env['x-api-key'] || process.env.DVLA_API_KEY;

  if (!dvlaApiKey) {
    console.log('DVLA_API_KEY not found, returning mock data for registration:', reg);
    // Mock response if no API key is provided
    return res.json({
      make: 'MOCK MAKE',
      model: 'MOCK MODEL',
      yearOfManufacture: 2020,
      colour: 'BLACK'
    });
  }

  try {
    const response = await axios.post(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      { registrationNumber: reg },
      {
        headers: {
          'x-api-key': dvlaApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('DVLA API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch vehicle details' });
  }
});

// API: Create Checkout Session
app.post('/api/checkout', async (req, res) => {
  const { serviceName, price, bookingDetails } = req.body;

  if (!stripe) {
    // Fallback: If Stripe is not configured, just confirm the booking directly
    try {
      if (supabase) {
        const { duration, ...dbBookingDetails } = bookingDetails;
        await supabase.from('bookings').insert([{ ...dbBookingDetails, status: 'confirmed' }]);
      }
      
      // Trigger notifications
      await sendEmailNotification(bookingDetails);
      await addToGoogleCalendar(bookingDetails);
      await sendSmsNotification(bookingDetails);

      return res.json({ success: true, url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=success` });
    } catch (error: any) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  try {
    // Save preliminary booking to Supabase (status: pending)
    let bookingId = 'mock-id';
    if (supabase) {
      // Remove duration from DB insert to prevent schema errors if the column doesn't exist
      const { duration, ...dbBookingDetails } = bookingDetails;
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ ...dbBookingDetails, status: 'pending_payment' }])
        .select()
        .single();
      
      if (error) throw error;
      bookingId = data.id;
    }

    if (price === 0) {
      // Free service, confirm immediately
      if (supabase) {
        await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      }
      
      // Trigger notifications
      await sendEmailNotification(bookingDetails);
      await addToGoogleCalendar(bookingDetails);
      await sendSmsNotification(bookingDetails);

      return res.json({ success: true, url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=success` });
    }

    const stringifiedDetails = JSON.stringify(bookingDetails);
    const metadata: any = { bookingId };
    if (stringifiedDetails.length <= 500) {
      metadata.bookingDetails = stringifiedDetails;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${serviceName} Deposit`,
              description: `Deposit for ${serviceName} at The MOT Garage`,
            },
            unit_amount: Math.round(price * 100), // Stripe expects pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=cancelled`,
      metadata
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Get Occupied Slots for a given date
async function getOccupiedSlots(date: string) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  let allBookings: any[] = [];

  if (supabase) {
    // Clean up old pending bookings first
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
      await supabase
        .from('bookings')
        .delete()
        .in('status', ['pending_payment', 'pending_setup'])
        .lt('created_at', fifteenMinsAgo);
    } catch (e) {}

    const { data: dbBookings } = await supabase
      .from('bookings')
      .select('appointment_time, service_id, status')
      .gte('appointment_time', startDate.toISOString())
      .lte('appointment_time', endDate.toISOString())
      .in('status', ['confirmed', 'pending_payment', 'pending_setup']);
    
    if (dbBookings) allBookings = [...dbBookings];
  }

  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  let calendarId = process.env.GOOGLE_CALENDAR_ID || process.env.EMAIL_USER || 'primary';

  if (credentialsBase64) {
    try {
      const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
      const credentials = JSON.parse(credentialsJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });
      const calendar = google.calendar({ version: 'v3', auth });
      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
      });
      const events = eventsResponse.data.items || [];
      const calendarBookings = events.map(event => {
        const start = new Date(event.start?.dateTime || event.start?.date || '');
        const end = new Date(event.end?.dateTime || event.end?.date || '');
        return {
          appointment_time: start.toISOString(),
          duration: (end.getTime() - start.getTime()) / (1000 * 60),
          status: 'confirmed'
        };
      });
      // Filter out confirmed from DB if we have Google Calendar
      allBookings = allBookings.filter(b => b.status !== 'confirmed');
      allBookings = [...allBookings, ...calendarBookings];
    } catch (e) {}
  }

  return allBookings.map(b => {
    const start = new Date(b.appointment_time);
    const duration = b.duration || getServiceDuration({ service_id: b.service_id });
    return { start, end: new Date(start.getTime() + duration * 60000) };
  });
}

// API: Create Setup Session (Save Card for No-Show Fee)
app.post('/api/create-setup-session', async (req, res) => {
  const { bookingDetails } = req.body;

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    // 1. Server-side concurrency check
    const occupied = await getOccupiedSlots(bookingDetails.appointment_time);
    const requestedStart = new Date(bookingDetails.appointment_time);
    const duration = bookingDetails.duration || getServiceDuration({ service_id: bookingDetails.service_id });
    const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

    // Check every 15 minutes for overlaps
    for (let t = new Date(requestedStart); t < requestedEnd; t = new Date(t.getTime() + 15 * 60000)) {
      const count = occupied.filter(b => t >= b.start && t < b.end).length;
      if (count >= 2) {
        return res.status(400).json({ error: 'This slot is no longer available. Please choose another time.' });
      }
    }

    // 2. Save preliminary booking to Supabase (status: pending_setup)
    let bookingId = 'mock-id';
    if (supabase) {
      const { duration: _, ...dbBookingDetails } = bookingDetails;
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ ...dbBookingDetails, status: 'pending_setup' }])
        .select()
        .single();
      
      if (error) throw error;
      bookingId = data.id;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?booking=cancelled`,
      metadata: { bookingId, type: 'setup' }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Setup Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Verify Stripe Session
app.get('/api/verify-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  if (!stripe) {
    console.log('Stripe not configured, skipping verification for session:', session_id);
    return res.json({ success: true, message: 'Stripe not configured, assuming success' });
  }

  try {
    console.log('Verifying Stripe session:', session_id);
    const session = await stripe.checkout.sessions.retrieve(session_id).catch(err => {
      console.error('Stripe Retrieve Error:', err.message);
      return null;
    });

    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found or expired' });
    }
    
    const isSetup = session.metadata?.type === 'setup';
    
    if (session.payment_status === 'paid' || (isSetup && session.status === 'complete')) {
      const bookingId = session.metadata?.bookingId;
      let bookingDetails = null;
      let paymentMethodId = null;

      if (isSetup && session.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
        paymentMethodId = setupIntent.payment_method as string;
      }
      
      try {
        if (session.metadata?.bookingDetails) {
          bookingDetails = JSON.parse(session.metadata.bookingDetails);
        }
      } catch (e) {
        console.error('Failed to parse booking details from metadata', e);
      }

      let shouldSendNotifications = false;

      if (supabase && bookingId && bookingId !== 'mock-id') {
        const { data: booking } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (booking && (booking.status === 'pending_payment' || booking.status === 'pending_setup')) {
          const updateData: any = { status: 'confirmed' };
          if (paymentMethodId) {
            updateData.payment_method_id = paymentMethodId;
          }
          if (session.customer) {
            updateData.stripe_customer_id = session.customer as string;
          }
          await supabase.from('bookings').update(updateData).eq('id', bookingId);
          shouldSendNotifications = true;
          // Use booking details from DB if available
          bookingDetails = bookingDetails || booking;
        }
      } else if (session.metadata?.notifications_sent !== 'true') {
        shouldSendNotifications = true;
        try {
          // Mark as sent to prevent duplicates on refresh if no DB
          await stripe.checkout.sessions.update(session_id, {
            metadata: { notifications_sent: 'true' }
          });
        } catch (e) {
          console.error('Failed to update session metadata', e);
        }
      }

      if (shouldSendNotifications && bookingDetails) {
        // Trigger notifications
        await sendEmailNotification(bookingDetails).catch(e => console.error('Email error:', e));
        await addToGoogleCalendar(bookingDetails).catch(e => console.error('Calendar error:', e));
        await sendSmsNotification(bookingDetails).catch(e => console.error('SMS error:', e));
      }

      res.json({ success: true, status: session.payment_status });
    } else {
      res.json({ success: false, status: session.payment_status });
    }
  } catch (error: any) {
    console.error('Verify Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Check Calendar ID
app.get('/api/check-calendar-id', async (req, res) => {
  try {
    const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    if (!credentialsBase64) {
      return res.json({ hasCredentials: false });
    }
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarList = await calendar.calendarList.list();
    res.json({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      hasCredentials: true,
      calendars: calendarList.data.items?.map(c => ({ id: c.id, summary: c.summary }))
    });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// API: Test Calendar Integration
app.get('/api/test-calendar', async (req, res) => {
  try {
    const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    const calendarId = 'primary';
    if (!credentialsBase64) {
      return res.json({ success: false, error: 'Missing credentials' });
    }
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
      summary: 'Test Event from AI Studio',
      start: { dateTime: new Date().toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: 'Europe/London' },
    };
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });
    res.json({ success: true, eventLink: response.data.htmlLink, calendarId });
  } catch (error: any) {
    res.json({ success: false, error: error.message, details: error.response?.data, calendarId: 'primary' });
  }
});

// API: Share Service Account Calendar
app.get('/api/share-calendar', async (req, res) => {
  try {
    const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    if (!credentialsBase64) {
      return res.json({ success: false, error: 'Missing credentials' });
    }
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Share the service account's primary calendar with kav@solere.co
    const rule = {
      scope: { type: 'user', value: 'kav@solere.co' },
      role: 'owner',
    };
    const response = await calendar.acl.insert({
      calendarId: 'primary',
      requestBody: rule,
    });
    
    res.json({ 
      success: true, 
      message: 'Calendar shared successfully. Please check kav@solere.co email to accept the shared calendar.',
      serviceAccountEmail: credentials.client_email,
      calendarId: credentials.client_email
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message, details: error.response?.data });
  }
});

// API: Fetch bookings for a specific date
app.get('/api/bookings', async (req, res) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  try {
    // Get start and end of the day in UTC
    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date parameter' });
    }
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let allBookings: any[] = [];

    // 1. Fetch from Supabase
    if (supabase) {
      // Clean up old pending_payment and pending_setup bookings (older than 15 minutes)
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      try {
        await supabase
          .from('bookings')
          .delete()
          .in('status', ['pending_payment', 'pending_setup'])
          .lt('created_at', fifteenMinsAgo);
      } catch (cleanupError) {
        console.error('Failed to cleanup old pending bookings:', cleanupError);
      }

      const { data: dbBookings, error } = await supabase
        .from('bookings')
        .select('appointment_time, service_id, status')
        .gte('appointment_time', startDate.toISOString())
        .lte('appointment_time', endDate.toISOString())
        .in('status', ['confirmed', 'pending_payment', 'pending_setup']);

      if (error) {
        console.error('Fetch DB Bookings Error:', error);
      } else if (dbBookings) {
        allBookings = [...dbBookings];
      }
    }

    // 2. Fetch from Google Calendar (Free/Busy)
    const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    let calendarId = process.env.GOOGLE_CALENDAR_ID || process.env.EMAIL_USER || 'primary';

    if (credentialsBase64) {
      try {
        console.log(`Fetching Google Calendar free/busy for: ${calendarId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
        const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
        const credentials = JSON.parse(credentialsJson);

        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });

        const calendar = google.calendar({ version: 'v3', auth });
        
        const eventsResponse = await calendar.events.list({
          calendarId: calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          timeZone: 'Europe/London',
        });

        const events = eventsResponse.data.items || [];
        console.log(`Found ${events.length} events in Google Calendar for ${calendarId}`);
        
        // Map events to our booking format
        const calendarBookings = events.map(event => {
          const start = new Date(event.start?.dateTime || event.start?.date || '');
          const end = new Date(event.end?.dateTime || event.end?.date || '');
          const duration = (end.getTime() - start.getTime()) / (1000 * 60);
          
          return {
            appointment_time: start.toISOString(),
            service_id: 'google_calendar_event',
            status: 'confirmed',
            duration: duration
          };
        });

        // If Google Calendar fetch succeeds, we use it as the source of truth for confirmed bookings.
        // We remove 'confirmed' bookings from Supabase to avoid double-counting and to respect cancellations made in Google Calendar.
        const beforeFilterCount = allBookings.length;
        allBookings = allBookings.filter(b => b.status !== 'confirmed');
        const afterFilterCount = allBookings.length;
        console.log(`Filtered out ${beforeFilterCount - afterFilterCount} confirmed bookings from DB, now merging with ${calendarBookings.length} calendar slots`);
        
        allBookings = [...allBookings, ...calendarBookings];
      } catch (calError: any) {
        console.error('CRITICAL: Failed to fetch Google Calendar events:', calError.message || calError);
        // If calendar fails, we MUST keep DB bookings as fallback, but we log the failure clearly
      }
    }

    res.json({ bookings: allBookings });
  } catch (error: any) {
    console.error('Fetch Bookings Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// API: Save Booking directly (if no deposit or Stripe not configured)
app.post('/api/bookings', async (req, res) => {
  const { bookingDetails } = req.body;
  
  try {
    if (supabase) {
      const { error } = await supabase
        .from('bookings')
        .insert([{ ...bookingDetails, status: 'confirmed' }]);
      
      if (error) throw error;
    }

    // Trigger notifications
    await sendEmailNotification(bookingDetails);
    await addToGoogleCalendar(bookingDetails);
    await sendSmsNotification(bookingDetails);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Supabase Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Clear All Bookings (Temporary helper)
app.get('/api/clear-all-bookings', async (req, res) => {
  if (!supabase) return res.json({ error: 'Supabase not configured' });
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
    res.json({ success: true, message: 'All bookings cleared' });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// API: Clear Test Bookings (Temporary helper)
app.get('/api/clear-test-bookings', async (req, res) => {
  if (!supabase) return res.json({ error: 'Supabase not configured' });
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .or('customer_name.ilike.%test%,customer_name.ilike.%James%');
    if (error) throw error;
    res.json({ success: true, message: 'Test bookings cleared' });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// API: Admin - Fetch all bookings
app.get('/api/admin/bookings', async (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (adminPassword && providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('appointment_time', { ascending: false });
    
    if (error) throw error;
    res.json({ bookings: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Admin - Charge No-Show Fee
app.post('/api/admin/charge-no-show', async (req, res) => {
  const { bookingId, amount } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (adminPassword && providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // 1. Get booking details and payment method
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) throw new Error('Booking not found');

    // If no payment method, just mark as no-show in DB without charging Stripe
    if (!booking.payment_method_id || !stripe) {
      await supabase
        .from('bookings')
        .update({ 
          status: 'no_show_marked',
          no_show_fee_paid: 0
        })
        .eq('id', bookingId);
      
      return res.json({ success: true, message: 'Booking marked as no-show (no card to charge)' });
    }

    // 2. Create a PaymentIntent and confirm it immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // in pence
      currency: 'gbp',
      payment_method: booking.payment_method_id,
      customer: booking.stripe_customer_id, // Optional, but good if we have it
      confirm: true,
      off_session: true,
      description: `No-show fee for ${booking.service_name} on ${booking.appointment_time}`,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    // 3. Update booking status
    await supabase
      .from('bookings')
      .update({ 
        status: 'no_show_charged',
        no_show_fee_paid: amount,
        stripe_payment_intent_id: paymentIntent.id
      })
      .eq('id', bookingId);

    res.json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (error: any) {
    console.error('Charge No-Show Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Global Error Handler for API routes
app.use('/api', (err: any, req: any, res: any, next: any) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

async function startServer() {
  // Vite middleware for development
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (!isProd || !hasDist) {
    if (isProd && !hasDist) {
      console.warn('Warning: NODE_ENV is production but dist folder not found. Falling back to Vite development mode.');
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(distPath));
    
    // Handle SPA routing: serve index.html for any unknown routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Run 11-month reminders after a short delay to let server settle
    setTimeout(() => {
      sendElevenMonthReminders().catch(e => console.error('Initial reminder check failed:', e));
    }, 5000);
    
    setInterval(() => {
      sendElevenMonthReminders().catch(e => console.error('Daily reminder check failed:', e));
    }, 24 * 60 * 60 * 1000);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
});
