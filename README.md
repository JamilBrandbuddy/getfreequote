# Auto Glass Wizard Pro

I want to build a premium, conditional, multi-step auto-glass quote system inspired by the user journey and functionality of this reference:

Reference URL:
https://saskatoonautoglass.ca/get-quote-saskatoon

Do not copy its branding, copyrighted content, images, logo or exact visual design. Study the type of user journey and create a better, more complete and more modern system.

For this first task, do not write or modify any code.

Create a detailed implementation plan for a standalone Auto Glass Quote Wizard that can later be used at:

/get-quote

It must also be reusable as an embeddable React component named:

Primary business goal:

Collect highly qualified auto-glass leads while making the process feel fast, simple and trustworthy. The user should only see questions relevant to their previous answers.

Target customers:

Vehicle owners who need windshield repair, windshield replacement, side or rear glass replacement, sunroof glass service, side mirror service, leak diagnosis or ADAS recalibration.

The system must include these major stages:

Welcome screen

Glass-area selection

Service selection

Damage assessment

Damage cause

Insurance and SGI questions

Vehicle information

Glass-specific vehicle features

Service location

Preferred appointment timing

Photo and document upload

Customer contact details

Review and submission

Confirmation screen

Create a complete decision tree showing:

Every possible answer

Which question appears next

Which steps should be skipped

Which fields are required

Which fields are optional

What happens when the user selects “Not sure”

What happens when the user returns to a previous step and changes an answer

How the progress percentage is calculated for different conditional paths

Important conditional paths:

Windshield repair

Windshield replacement

Windshield leak or wind noise

ADAS recalibration

Side door glass replacement

Rear door glass replacement

Rear windshield replacement

Quarter glass

Vent glass

Sunroof or moonroof

Side mirror

Insurance claim

Private payment

Road-debris damage

Collision damage

Vandalism or break-in

Hail or weather damage

Mobile service

In-shop service

User is not sure what service is needed

Technology plan:

React

TypeScript

Tailwind CSS

shadcn/ui

React Hook Form

Zod validation

A route-aware state machine or reducer for conditional navigation

LocalStorage autosave

Supabase or Lovable Cloud later for database, storage and administration

Resend later for email notifications

Webhook support for CRM, Zapier or Make

GA4, Meta Pixel and Google Ads conversion events

The first version should be frontend-first with mock data. Do not connect the database until the entire form flow, design, conditional logic and mobile responsiveness are working correctly.

The plan must include:

Component architecture

TypeScript data models

Conditional routing structure

Validation rules

Form-state structure

Error handling

Accessibility requirements

Mobile behavior

Analytics event structure

Database schema for the later backend phase

Admin dashboard requirements

Submission security requirements

Testing matrix for all major conditional paths

Visual direction:

Create a premium Canadian automotive-service experience. It should feel trustworthy, local, modern and easy enough for older customers to use.

Use:

Clean white or very light grey background

Deep navy primary colour

Warm amber or orange CTA accent

High-contrast text

Large selection cards

Rounded corners between 16px and 22px

Soft shadows

Subtle gradients

Clear icons and simple vehicle illustrations

Generous spacing

Smooth but restrained transitions

No excessive glassmorphism

No neon appearance

No crowded dashboard-style interface

No small form controls

No long form displayed on a single screen

Desktop layout:

Main wizard on the left or centre

Contextual trust panel on the right

Sticky progress header

Sticky assistance or call option

Mobile layout:

Single-column

Full-width selection cards

Large touch targets

Sticky bottom Continue button

Back button always available

No horizontal scrolling

Vehicle diagram must have a mobile-friendly card alternative

Ask me only about genuinely missing business information such as branding, notification email, phone number and service territory. Do not ask questions about the functional flow because the requirements above should be treated as authoritative.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://getfreequote.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1964a406-5e5b-4ff9-87fb-e8377d7660bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
