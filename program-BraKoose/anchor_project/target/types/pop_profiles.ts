/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pop_profiles.json`.
 */
export type PopProfiles = {
  "address": "G1zjKn49JAVXw7jcdUdMtkJztGshRZWhojDKy6QjoFfx",
  "metadata": {
    "name": "popProfiles",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "addCertification",
      "docs": [
        "Adds a certification/work record to the user's profile. Only the profile owner can add."
      ],
      "discriminator": [
        181,
        104,
        148,
        211,
        201,
        62,
        122,
        25
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "certification",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  101,
                  114,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "profile"
              },
              {
                "kind": "account",
                "path": "profile.cert_count",
                "account": "userProfile"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "issuer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createUserProfile",
      "docs": [
        "Creates a new user profile PDA. Each wallet may only have one profile."
      ],
      "discriminator": [
        9,
        214,
        142,
        184,
        153,
        65,
        50,
        174
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "username",
          "type": "string"
        },
        {
          "name": "bio",
          "type": "string"
        }
      ]
    },
    {
      "name": "emitViewProfile",
      "docs": [
        "Emits the current profile state (read helper). Does not modify state."
      ],
      "discriminator": [
        193,
        121,
        130,
        85,
        6,
        231,
        93,
        218
      ],
      "accounts": [
        {
          "name": "profile",
          "docs": [
            "The profile to view"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "profile.owner",
                "account": "userProfile"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "endorseUser",
      "docs": [
        "Endorse a user with feedback and optional rating. Self-endorsement is not allowed."
      ],
      "discriminator": [
        66,
        3,
        1,
        116,
        244,
        126,
        64,
        110
      ],
      "accounts": [
        {
          "name": "endorser",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "docs": [
            "Profile can belong to any user; endorsement is from `endorser`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "profile.owner",
                "account": "userProfile"
              }
            ]
          }
        },
        {
          "name": "endorsement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  100,
                  111,
                  114,
                  115,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "profile"
              },
              {
                "kind": "account",
                "path": "endorser"
              },
              {
                "kind": "account",
                "path": "profile.endorsement_count",
                "account": "userProfile"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feedback",
          "type": "string"
        },
        {
          "name": "rating",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "certification",
      "discriminator": [
        141,
        130,
        166,
        168,
        167,
        23,
        163,
        147
      ]
    },
    {
      "name": "endorsement",
      "discriminator": [
        167,
        137,
        37,
        17,
        220,
        102,
        104,
        52
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "events": [
    {
      "name": "certificationEvent",
      "discriminator": [
        124,
        97,
        5,
        227,
        233,
        25,
        34,
        31
      ]
    },
    {
      "name": "endorsementEvent",
      "discriminator": [
        210,
        33,
        172,
        231,
        118,
        21,
        189,
        239
      ]
    },
    {
      "name": "profileEvent",
      "discriminator": [
        211,
        51,
        41,
        161,
        21,
        210,
        222,
        227
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "usernameTooLong",
      "msg": "Username too long"
    },
    {
      "code": 6001,
      "name": "bioTooLong",
      "msg": "Bio too long"
    },
    {
      "code": 6002,
      "name": "titleTooLong",
      "msg": "Title too long"
    },
    {
      "code": 6003,
      "name": "uriTooLong",
      "msg": "URI too long"
    },
    {
      "code": 6004,
      "name": "feedbackTooLong",
      "msg": "Feedback too long"
    },
    {
      "code": 6005,
      "name": "invalidRating",
      "msg": "Invalid rating (0-5)"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6007,
      "name": "overflow",
      "msg": "overflow"
    },
    {
      "code": 6008,
      "name": "selfEndorsementNotAllowed",
      "msg": "Self endorsement not allowed"
    }
  ],
  "types": [
    {
      "name": "certification",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "certificationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "endorsement",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "endorser",
            "type": "pubkey"
          },
          {
            "name": "feedback",
            "type": "string"
          },
          {
            "name": "rating",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "endorsementEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "endorser",
            "type": "pubkey"
          },
          {
            "name": "rating",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "profileEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "certCount",
            "type": "u32"
          },
          {
            "name": "endorsementCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "certCount",
            "type": "u32"
          },
          {
            "name": "endorsementCount",
            "type": "u32"
          }
        ]
      }
    }
  ]
};
