
# Fature

www.fature.xyz

Fature is a no-code crypto payment solution designed for small to medium-sized businesses, enabling them to easily accept USDC and SOL on the Solana blockchain. It simplifies crypto acceptance by providing a web-based platform with low fees, instant payouts, and a user-friendly interface that requires no technical expertise. Fature aims to bridge the gap between "crypto-curious" merchants and the benefits of digital currency, streamlining transactions and modernizing payment options.

## Project Status

This open-source payment module is **actively developed and maintained** as a core component of the Fature platform. We are committed to its ongoing improvement and reliability.

While this module provides transparency into our core transaction logic, it is designed to operate within the broader Fature ecosystem. For full functionality and production use, it relies on integration with the complete Fature platform.

## Open-Source Solana Pay Module

This repository contains Fature's open-source payment module. It is an implementation of Solana Pay and Solana Actions, adhering to the official specifications found at https://docs.solanapay.com/spec, specifically focusing on the construction of unsigned transactions. This module is built with Node.js and TypeScript.

**Relationship to the Fature Platform:**

This module is a core component of the Fature platform but is not a standalone service. It has important dependencies on other parts of the Fature ecosystem:

-   **Web Client (React):** The React-based web client is responsible for generating and displaying QR codes. It also provides the user interface for initiating transactions and interacts with the backend API (which includes this module).
-   **Backend Server (Node.js):** Beyond this module, the Fature backend server handles database interactions for storing transaction data and merchant profiles. It also polls the Solana blockchain to retrieve and update transaction statuses, ensuring accurate tracking of payment confirmations.

This repository focuses specifically on the core logic for constructing unsigned Solana Pay and Solana Actions transactions. Other components, such as the broader UI elements, wallet interaction for signing/submission, and general database management, are handled outside of this open-source module.

## Getting Started

This module is designed to be an integral part of the Fature platform and is not intended for standalone use. Its primary role is to handle the core logic for Solana Pay transactions and Solana Actions, adhering to the official Solana specifications.

**Key API Endpoint: `/api/pay`**

The main API endpoint exposed by this module is `/api/pay`.
- A `GET` request to this endpoint, typically initiated by a Solana Pay QR code scan or by a Solana Action URL, provides information about the action to be performed (e.g., recipient, currency, amount, descriptive metadata).
- A `POST` request to this endpoint, providing the payer's account, is used to request the construction of an unsigned Solana transaction for a Solana Pay payment or a Solana Action.

**Prerequisites for Operation (within the Fature Platform):**

To function correctly, this module, as part of the Fature platform, requires:
- A configured Solana RPC (Remote Procedure Call) endpoint to interact with the Solana blockchain.
- A Fature merchant account context, which is managed by the main Fature platform and provides necessary details like the recipient wallet address and supported tokens.

**Conceptual Interaction Flow:**

1.  **Initiation (Fature Web Client):** The Fature Web Client generates and displays a Solana Pay QR code representing a payment request for a specific merchant, or a Solana Action URL.
2.  **Scan & Request (User Wallet):** A user scans the QR code or clicks the Action URL with their Solana-compatible wallet. The wallet makes a `GET` request to this module's `/api/pay` endpoint (as specified in the QR code/URL) to fetch action details.
3.  **Request for Transaction (User Wallet to `/api/pay`):** After the user confirms the action in their wallet, the wallet makes a `POST` request to this module's `/api/pay` endpoint, providing the user's `account` (public key) in the request body.
4.  **Transaction Construction (This Module):** This module receives the `POST` request. Based on the `transactionId` (from the URL query parameter, not shown in this simplified flow but detailed in API Reference) and the provided `account`, it constructs the appropriate unsigned Solana transaction, serializes it, base64 encodes it, and returns it in the response.
5.  **Transaction Signing and Submission (User Wallet):** The user's wallet receives the serialized, unsigned transaction. It then deserializes it, signs it with the user's private key (typically after a final user confirmation), and submits the signed transaction to the Solana network.
6.  **Status Tracking (Main Fature Backend):** The main Fature backend server then monitors the Solana blockchain to track the status of this transaction (e.g., confirmation, completion) and updates the merchant's records accordingly.

## API Reference

This section details the API endpoint provided by this open-source module.

**Endpoint: `GET /api/pay`**

*   **Purpose:** This method is invoked when a Solana Pay QR code is scanned or a Solana Action URL is initially accessed. It provides the wallet with the necessary metadata to display information about the transaction or action to the user.
*   **Query Parameters:**
    *   `transactionId` (string): An identifier for the specific transaction or action being requested. This ID is used by the Fature platform to fetch the relevant details. (e.g., `/api/pay?transactionId=ORDER_123`)
*   **Successful Response (follows `ActionGetResponse` schema):**
    *   `icon` (string): URL of an image (e.g., merchant logo or item picture). Example: `"https://example.com/product_icon.png"`
    *   `title` (string): A short title describing the action. Example: `"Complete Your Purchase"`
    *   `description` (string): A more detailed description of what the transaction is for. Example: `"Payment for T-Shirt Order #123"`
    *   `label` (string): The call-to-action text for the button in the wallet. Example: `"Pay $15.00 USDC"`
    *   *Note: While the Solana Pay and Solana Actions specification allows for optional fields like `disabled` (boolean) or `links.actions` (array for linked actions), this module's `GET` handler currently focuses on providing the core metadata listed above.*
*   **Example Flow:**
    1.  User scans a QR code generated by the Fature platform or clicks a Solana Action link.
    2.  The wallet performs a `GET` request to `/api/pay?transactionId=ORDER_123`.
    3.  This module retrieves details associated with `ORDER_123` and returns the JSON payload according to the `ActionGetResponse` schema.

**Endpoint: `POST /api/pay`**

*   **Purpose:** This method is called by a client (e.g., a Solana wallet) after the user has reviewed the action details (obtained from a `GET` request) and wishes to proceed. This endpoint's sole responsibility is to construct and return a base64 encoded, serialized, *unsigned* Solana transaction based on the action details (identified by `transactionId`) and the provided payer `account`. It does **not** process any payment or directly execute any action itself.
*   **Query Parameters:**
    *   `transactionId` (string): An identifier for the specific action or transaction details this module should use to construct the transaction. (e.g., `/api/pay?transactionId=ORDER_123`)
*   **Request Body (JSON):**
    *   `account` (string): The base58 encoded public key of the user's wallet account that is intended to sign and pay for the transaction. This module uses this account as the fee payer and a party in the transaction. Example: `{"account": "So11111111111111111111111111111111111111112"}`
*   **Successful Response (follows `ActionPostResponse` schema):**
    *   `transaction` (string): A base64 encoded, serialized, *unsigned* Solana transaction. The caller is responsible for deserializing this transaction, having it signed by the appropriate account (usually the `account` specified in the request body), and then submitting the signed transaction to the Solana blockchain.
    *   `message` (string, optional): A human-readable message that might suggest the next steps or confirm the transaction's nature. Example: `"Please sign and submit this transaction to complete your payment of $15.00 USDC for Order #123."`
    *   *Note: While the Solana Pay and Solana Actions specification allows for an optional `redirect` (string) field in the response, this module's `POST` handler currently focuses on providing the unsigned transaction and an optional message.*
*   **Example Flow:**
    1.  User reviews information from the `GET` request in their wallet and confirms they wish to proceed with the action.
    2.  The caller (e.g., user's wallet) performs a `POST` request to this module's `/api/pay?transactionId=ORDER_123` endpoint, including the user's `account` (public key) in the request body: `{"account": "USER_WALLET_PUBLIC_KEY"}`.
    3.  This module constructs the appropriate *unsigned* Solana transaction based on the details associated with `ORDER_123` and the payer's `account`, then serializes it, base64 encodes it, and returns this string in the `transaction` field of the JSON response.
    4.  The caller (e.g., user's wallet) receives this serialized, unsigned transaction. The caller then deserializes it, signs it with the user's private key (after appropriate user confirmation), and submits the *signed* transaction to the Solana network.

**Error Handling:**

The `/api/pay` endpoint will return standard HTTP status codes for errors.
-   `400 Bad Request`: For client-side errors, such as an invalid `transactionId` or an invalid `account` public key in the `POST` request body.
-   `500 Internal Server Error`: For server-side issues encountered while processing the request.
In both cases, the response body will typically be a JSON object with an `error` field containing a descriptive message, for example: `{"error": "Invalid account public key"}`.

## Why Open Source?

We've chosen to open-source the core transaction logic of our payment module for several key reasons:

*   **Transparency:** As a new brand, Fature prioritizes building user trust. By making our Solana transaction creation and processing implementation available for public review, we offer transparency into how payments and fees are handled.
*   **Security:** Allowing the community to inspect the code helps in identifying and rectifying potential vulnerabilities, leading to a more secure system for everyone.
*   **Verification:** Merchants and users can independently verify that our processes align with Solana Pay specifications and that fee calculations are accurate.
*   **Community Engagement:** We believe in the power of the open-source community and hope to foster collaboration and contributions that can benefit the broader Solana ecosystem.

We've focused on open-sourcing the critical payment processing components. The remaining parts of the Fature platform, primarily involving data storage and retrieval for transaction status and merchant profiles, are not open-sourced. This separation allows us to maintain the security of sensitive data while providing complete transparency for the core payment functionality.

This approach ensures that our users can confidently verify the integrity of our payment system, fostering a secure and trustworthy environment.

## Contributing

We are excited to welcome contributions from the community to help improve Fature's open-source payment module! If you're interested in contributing, please review the guidelines below.

**How to Contribute:**

*   **Reporting Issues:** If you find a bug, have a feature request, or a suggestion for improvement, please open an issue on the GitHub repository. Provide as much detail as possible, including steps to reproduce for bugs.
*   **Pull Requests:** For code contributions, please follow these steps:
    1.  Fork the repository.
    2.  Create a new branch for your feature or bug fix (e.g., `feature/your-feature-name` or `fix/issue-description`).
    3.  Make your changes. Aim for clean, readable code that aligns with the existing style.
    4.  If your changes involve new functionality or modify existing logic, please consider if tests are needed. While not strictly required for all PRs, contributions that include or discuss testing are highly valued.
    5.  Ensure your commit messages are clear, concise, and descriptive of the changes made.
    6.  Submit a pull request to the `main` branch for review. Please provide a clear description of the problem you're solving and the changes you've made in your PR description.

**Code of Conduct:**

While we don't have a formal Code of Conduct document for this specific open-source module yet, we expect all contributors and participants to engage in a respectful and constructive manner. Please be considerate of others in all discussions and contributions.

**Questions:**

If you have any questions about contributing, how this module works, or if you'd like to discuss a potential contribution before starting work, please feel free to open an issue on this GitHub repository. Tag it with "question" or "discussion" if appropriate.

## Contact / Support

For any questions, to report issues, or for support specifically related to this open-source Solana Pay module, the best way to reach us is by **opening an issue** on this GitHub repository. We will do our best to respond in a timely manner.

For general inquiries about the Fature platform, its features for merchants, or for business-related questions, please visit our official website at [www.fature.xyz](https://www.fature.xyz) or use the contact methods provided there.

## License

This open-source module is licensed under the MIT License.
