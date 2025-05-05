
# Fature

www.fature.xyz

Fature is a no-code crypto payment solution designed for small to medium-sized businesses, enabling them to easily accept USDC and SOL on the Solana blockchain. It simplifies crypto acceptance by providing a web-based platform that is easy for the merchants to use, offering low 0.3% fees, instant payouts, and a user-friendly interface that requires no technical expertise. Fature aims to bridge the gap between "crypto-curious" merchants and the benefits of digital currency, streamlining transactions and modernizing payment options.



## Tech Stack

**Client:** React

**Server:** Node.js

This directory has open-source layer of the payflow. This is an implementation of Solana Pay/Action that follows the [specs](https://docs.solanapay.com/spec) from the Solana website.

Currently this repo is not a standalone service. There are some dependencies on the web client and the backend server.

- The web client is responsible for rendering the QR Code and interfacing with the backend.

- The backend is used for interacting with the database and fetching the blockchain transaction status. 



**Client:** React

**Server:** Node.js

This repository contains the open-source transaction processing module, an implementation of Solana Pay/Actions adhering to the official specifications: https://docs.solanapay.com/spec.

**Important Dependencies:**

This module is not a standalone service and relies on other components within the Fature platform.

- Web Client (React): The React-based web client is responsible for generating and displaying the QR code, as well as providing the user interface for initiating transactions and interacting with the backend API.
- Backend Server (Node.js): The Node.js backend server handles database interactions for storing transaction data and merchant profiles. It also polls the Solana blockchain to retrieve and update transaction status, ensuring accurate tracking of payment confirmations.

**Additional Notes:**

This repository focuses specifically on the core transaction logic related to Solana Pay. Other components, such as UI elements and database management, are handled outside of this open-source module.

## Why Open Source?

We've chosen to open source the core transaction logic for security and transparency. As a new brand, Fature prioritizes building user trust in our transaction processing and fee calculations. By making the Solana transaction creation implementation available for public review, we ensure that our processes are verifiable and secure.

We've focused on open-sourcing the critical payment processing components. The remaining parts of the project, primarily involving data storage and retrieval for transaction status and merchant profiles, are not open-sourced. This separation allows us to maintain the security of sensitive data while providing complete transparency for the core payment functionality.

This approach ensures that our users can confidently verify the integrity of our payment system, fostering a secure and trustworthy environment.
