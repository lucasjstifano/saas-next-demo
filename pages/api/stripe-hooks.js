// Import the Stripe library and the buffer method from the micro library
import Stripe from "stripe";
import { buffer } from "micro";
// Import a function to get a connection to Supabase
import { getServiceSupabase } from "../../utils/supabase";

// Disable the default bodyParser in Next.js API routes
export const config = { api: { bodyParser: false } };

// Define an async function to handle the webhook event
const handler = async (req, res) => {
  // Create a new instance of the Stripe object using the Stripe secret key from environment variables
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // Get the Stripe signature from the request headers
  const signature = req.headers["stripe-signature"];
  // Get the Stripe signing secret from environment variables
  const signingSecret = process.env.STRIPE_SIGNING_SECRET;
  // Read the request body buffer using the buffer method
  const reqBuffer = await buffer(req);

  let event;

  // Verify the webhook event using the Stripe library
  try {
    event = stripe.webhooks.constructEvent(reqBuffer, signature, signingSecret);
  } catch (error) {
    console.log(error);
    // Return a 400 Bad Request response if the verification fails
    return res.status(400).send(`Stripe Webhook Error: ${error.message}`);
  }

  // Get a connection to Supabase using the getServiceSupabase function
  const supabase = getServiceSupabase();

  // Handle the webhook event based on the event type
  switch (event.type) {
    // If the event is a customer subscription created event
    case "customer.subscription.created":
      // Update the is_subscribed column of the profile table in Supabase to true
      // Update the interval column of the profile table in Supabase to the corresponding stripe subscription interval
      // for the customer associated with the subscription
      await supabase
        .from("profile")
        .update({
          is_subscribed: true,
          interval: event.data.object.items.data[0].plan.interval,
        })
        .eq("stripe_customer", event.data.object.customer);
  }

  // Log the event object to the console
  console.log({ event });

  // Send a response indicating the webhook event was received
  res.send({ received: true });
};

// Export the webhook handler function as the default export
export default handler;
