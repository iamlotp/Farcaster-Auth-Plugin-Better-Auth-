interface UserDataResponse {
  messages: {
    data: {
      type: string;
      fid: number;
      timestamp: number;
      network: string;
      userDataBody: {
        type: string;
        value: string;
      };
    };
    hash: string;
    hashScheme: string;
    signature: string;
    signatureScheme: string;
    signer: string;
  }[];
  nextPageToken: string;
}

export interface FarcasterUserData {
  PFP?: string;
  DISPLAY?: string;
  BIO?: string;
  URL?: string;
  USERNAME?: string;
  LOCATION?: string;
  TWITTER?: string;
  GITHUB?: string;
}

/**
    Function To Fetch User Data From A Farcaster Hub ("PINATA" by default),
    The Data Will Be Used To Create A User In The Custom "farcasterUser" Table
*/
export async function getUserDataByFid(fid: number, HTTP_HUB_URL: string): Promise<FarcasterUserData> {
  const url = `${HTTP_HUB_URL}/v1/userDataByFid?fid=${fid}`;
  const userData: FarcasterUserData = {};

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: UserDataResponse = await response.json();

    if (data.messages) {
      for (const message of data.messages) {
        if (message.data?.type === "MESSAGE_TYPE_USER_DATA_ADD") {
          const userDataBodyType = message.data.userDataBody?.type;
          const userDataBodyValue = message.data.userDataBody?.value;

          if (userDataBodyType && userDataBodyValue) {
            switch (userDataBodyType) {
              case "USER_DATA_TYPE_PFP":
                userData.PFP = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_DISPLAY":
                userData.DISPLAY = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_BIO":
                userData.BIO = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_URL":
                userData.URL = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_USERNAME":
                userData.USERNAME = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_LOCATION":
                userData.LOCATION = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_TWITTER":
                userData.TWITTER = userDataBodyValue;
                break;
              case "USER_DATA_TYPE_GITHUB":
                userData.GITHUB = userDataBodyValue;
                break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching user data for FID ${fid}:`, error);
  }

  return userData;
}