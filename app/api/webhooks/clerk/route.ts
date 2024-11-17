/* eslint-disable camelcase */

import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  // CREATE
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } =
      evt.data;
    const user = {
      clerkId: id,
      email: email_addresses[0]?.email_address,
      username: username || "",
      firstName: first_name || "",
      lastName: last_name || "",
      photo: image_url || "",
    };

    const newUser = await createUser(user);

    console.log("newUser=", newUser);

    const response = await newUser?.json();
    console.log("response=", response, "response._id=", response._id);

    // Set public metadata
    if (newUser) {
      (await clerkClient()).users.updateUserMetadata(id, {
        publicMetadata: {
          userId: response._id,
        },
      });
    }

    return NextResponse.json({ message: "OK", user: newUser });
  }

  // UPDATE
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name || "",
      lastName: last_name || "",
      username: username! || "",
      photo: image_url || "",
    };

    const updatedUser = await updateUser(id, user);

    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // DELETE
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    const deletedUser = await deleteUser(id!);

    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);

  return new Response("", { status: 200 });
}

// /* eslint-disable camelcase */
// import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import { Webhook } from "svix";

// import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

// export async function POST(req: Request) {
//   // Retrieve WEBHOOK_SECRET from environment variables
//   const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
//   if (!WEBHOOK_SECRET) {
//     throw new Error(
//       "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
//     );
//   }

//   // Get required headers
//   const headerPayload = await headers();
//   const svix_id = headerPayload.get("svix-id");
//   const svix_timestamp = headerPayload.get("svix-timestamp");
//   const svix_signature = headerPayload.get("svix-signature");

//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return new Response("Error occurred -- missing svix headers", {
//       status: 400,
//     });
//   }

//   // Parse the request body
//   const payload = await req.json();
//   const body = JSON.stringify(payload);

//   // Initialize the Svix webhook instance with the secret
//   const wh = new Webhook(WEBHOOK_SECRET);
//   let evt: WebhookEvent;

//   // Verify the incoming request
//   try {
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error("Error verifying webhook:", err);
//     return new Response("Verification failed", { status: 400 });
//   }

//   // Extract data from the event
//   const { id } = evt.data;
//   const eventType = evt.type;

//   try {
//     // Handle different event types
//     if (eventType === "user.created") {
//       const {
//         id,
//         email_addresses,
//         image_url,
//         first_name,
//         last_name,
//         username,
//       } = evt.data;

//       const user = {
//         clerkId: id,
//         email: email_addresses[0]?.email_address,
//         username: username || "",
//         firstName: first_name || "",
//         lastName: last_name || "",
//         photo: image_url || "",
//       };

//       // Assume createUser returns the user object directly
//       const newUser = await createUser(user);

//       const response = await newUser?.json();

//       if (newUser && response) {
//         (await clerkClient()).users.updateUserMetadata(id, {
//           publicMetadata: { userId: response._id },
//         });
//       }

//       return NextResponse.json({
//         message: "User created successfully",
//         user: newUser,
//       });
//     }

//     if (eventType === "user.updated") {
//       const { id, image_url, first_name, last_name, username } = evt.data;

//       const user = {
//         firstName: first_name || "",
//         lastName: last_name || "",
//         username: username || "",
//         photo: image_url || "",
//       };

//       const updatedUser = await updateUser(id, user);
//       return NextResponse.json({
//         message: "User updated successfully",
//         user: updatedUser,
//       });
//     }

//     if (eventType === "user.deleted") {
//       const deletedUser = await deleteUser(id!);
//       return NextResponse.json({
//         message: "User deleted successfully",
//         user: deletedUser,
//       });
//     }

//     console.log(`Unhandled event type: ${eventType}, id: ${id}`);
//     console.log("Webhook body:", body);

//     return new Response("Event received", { status: 200 });
//   } catch (error) {
//     console.error("Error processing event:", error);
//     return new Response("Internal server error", { status: 500 });
//   }
// }
