# Pop Profiles Frontend

This directory contains the frontend for the Pop Profiles dApp, providing two ways to interact with the on-chain program: a web-based user interface and a command-line Node.js demo script.

## 1. Web UI (Recommended)

A simple React-based web application built with Vite for users to manage their on-chain profiles.

### Features
-   **Wallet Connection:** Connect and disconnect using a Phantom-compatible wallet.
-   **Profile Management:** Create and update your on-chain profile, including your username and bio.
-   **Add Certifications:** Add work records or certifications to your profile, each with a title and a link (URI).
-   **Endorse Others:** Provide feedback and a rating for other users' profiles.
-   **View Profile:** See your own profile details, including your list of certifications.

### Getting Started

1.  **Install Dependencies:**
    ```bash
    yarn install
    ```

2.  **Configure Environment (Optional):**
    Create a `.env` file in the `frontend` directory to specify your cluster and program ID. If not provided, it will use defaults.

    ```
    VITE_CLUSTER=devnet
    VITE_PROGRAM_ID=PopPro111111111111111111111111111111111111111
    ```
    -   `VITE_CLUSTER`: The Solana cluster to connect to (`devnet` or `localnet`). Defaults to `devnet`.
    -   `VITE_PROGRAM_ID`: The public key of your deployed program. Defaults to the ID in the IDL file.

3.  **Run the Web App:**
    ```bash
    yarn web
    ```

4.  **Open in Browser:**
    Navigate to http://localhost:5173.

---

## 2. Node.js Demo Script

A command-line script that demonstrates creating a profile, adding a certification, and endorsing a user programmatically.

### Setup & Run

1.  **Prepare Wallet:** The script uses your default Solana CLI keypair. Ensure it's funded on the target cluster. You can also set the `SOLANA_KEYPAIR` environment variable to point to a different keypair file.
2.  **Run Demo:** Use `yarn node-demo`. You can set `CLUSTER` and `PROGRAM_ID` environment variables to override defaults.

---
**Note:** To fetch all endorsements for a profile, an off-chain indexer or RPC filtering would be required, as the demo focuses on direct account fetches.
