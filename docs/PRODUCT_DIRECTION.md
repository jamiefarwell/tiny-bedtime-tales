# Product direction

## Promise

**Tiny Bedtime Tales** gives parents a fresh bedtime story built around the broad things their child loves, while deliberately collecting as little identifying information as possible.

Core positioning:

> Don’t buy your child another story. Give them a world of their own.

## Parent-led profile

The product is parent-owned. A child does not need their own account.

Useful story ingredients:
- first name or nickname
- age band
- broad interests and hobbies
- pet first names
- friend first names
- favourite animals, themes, toys and places
- preferred story tone and length
- things the parent would like the story to avoid

Intentionally not requested:
- photographs
- surnames
- exact dates of birth
- addresses or postcodes
- schools or clubs
- phone numbers
- exact live location

## Story modes

1. Standalone adventure
2. Continuing adventure / series
3. Special occasion
4. Gentle helping story for ordinary childhood worries and transitions

Support stories remain fictional stories and are not presented as therapy, diagnosis or medical advice.

## Experience levels

Working pricing is currently:
- Read only — £2.50 / story
- Read + audio — £3.00 / story
- Illustrated — £4.00 / story

The first story is free. The purchase journey is represented in the UI, but checkout is intentionally not connected during the build.

## Retention

A child’s completed library should remain available after cancellation. Cancelling stops future delivery rather than taking away stories the parent has already received.

For continuing adventures, the system stores compact world memory rather than repeatedly sending every previous story back to the model.

## Technical direction

- Next.js / React frontend and server routes
- Vercel hosting
- Vercel AI Gateway so story models can be changed without rebuilding the product
- Supabase for parent auth, profiles, cloud story library and series memory
- Stripe/payment handoff deferred
- AI illustration and premium narration providers can be swapped behind service interfaces later
