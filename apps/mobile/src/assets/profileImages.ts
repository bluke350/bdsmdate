import { ImageSourcePropType } from "react-native";

const profileImages: Record<string, ImageSourcePropType> = {
  "pexels-jdgromov-5047816.jpg": require("../../assets/profilepics/pexels-jdgromov-5047816.jpg"),
  "pexels-olly-948875.jpg": require("../../assets/profilepics/pexels-olly-948875.jpg"),
  "pexels-szafran-16409678.jpg": require("../../assets/profilepics/pexels-szafran-16409678.jpg"),
  "pexels_couple_01.jpg": require("../../assets/profilepics/pexels_couple_01.jpg"),
  "pexels_couple_02.jpg": require("../../assets/profilepics/pexels_couple_02.jpg"),
  "pexels_couple_03.jpg": require("../../assets/profilepics/pexels_couple_03.jpg"),
  "pexels_couple_04.jpg": require("../../assets/profilepics/pexels_couple_04.jpg"),
  "pexels_couple_05.jpg": require("../../assets/profilepics/pexels_couple_05.jpg"),
  "pexels_couple_06.jpg": require("../../assets/profilepics/pexels_couple_06.jpg"),
  "pexels_couple_07.jpg": require("../../assets/profilepics/pexels_couple_07.jpg"),
  "pexels_couple_08.jpg": require("../../assets/profilepics/pexels_couple_08.jpg"),
  "pexels_couple_09.jpg": require("../../assets/profilepics/pexels_couple_09.jpg"),
  "pexels_couple_10.jpg": require("../../assets/profilepics/pexels_couple_10.jpg"),
  "pexels_couple_11.jpg": require("../../assets/profilepics/pexels_couple_11.jpg"),
  "pexels_couple_12.jpg": require("../../assets/profilepics/pexels_couple_12.jpg"),
  "pexels_couple_13.jpg": require("../../assets/profilepics/pexels_couple_13.jpg"),
  "pexels_couple_14.jpg": require("../../assets/profilepics/pexels_couple_14.jpg"),
  "pexels_couple_15.jpg": require("../../assets/profilepics/pexels_couple_15.jpg"),
  "pexels_man_01.jpg": require("../../assets/profilepics/pexels_man_01.jpg"),
  "pexels_man_02.jpg": require("../../assets/profilepics/pexels_man_02.jpg"),
  "pexels_man_03.jpg": require("../../assets/profilepics/pexels_man_03.jpg"),
  "pexels_man_04.jpg": require("../../assets/profilepics/pexels_man_04.jpg"),
  "pexels_man_05.jpg": require("../../assets/profilepics/pexels_man_05.jpg"),
  "pexels_man_06.jpg": require("../../assets/profilepics/pexels_man_06.jpg"),
  "pexels_man_07.jpg": require("../../assets/profilepics/pexels_man_07.jpg"),
  "pexels_man_08.jpg": require("../../assets/profilepics/pexels_man_08.jpg"),
  "pexels_man_09.jpg": require("../../assets/profilepics/pexels_man_09.jpg"),
  "pexels_man_10.jpg": require("../../assets/profilepics/pexels_man_10.jpg"),
  "pexels_man_11.jpg": require("../../assets/profilepics/pexels_man_11.jpg"),
  "pexels_man_12.jpg": require("../../assets/profilepics/pexels_man_12.jpg"),
  "pexels_man_13.jpg": require("../../assets/profilepics/pexels_man_13.jpg"),
  "pexels_man_14.jpg": require("../../assets/profilepics/pexels_man_14.jpg"),
  "pexels_man_15.jpg": require("../../assets/profilepics/pexels_man_15.jpg"),
  "pexels_man_16.jpg": require("../../assets/profilepics/pexels_man_16.jpg"),
  "pexels_man_17.jpg": require("../../assets/profilepics/pexels_man_17.jpg"),
  "pexels_man_18.jpg": require("../../assets/profilepics/pexels_man_18.jpg"),
  "pexels_man_19.jpg": require("../../assets/profilepics/pexels_man_19.jpg"),
  "pexels_man_20.jpg": require("../../assets/profilepics/pexels_man_20.jpg"),
  "pexels_woman_01.jpg": require("../../assets/profilepics/pexels_woman_01.jpg"),
  "pexels_woman_02.jpg": require("../../assets/profilepics/pexels_woman_02.jpg"),
  "pexels_woman_03.jpg": require("../../assets/profilepics/pexels_woman_03.jpg"),
  "pexels_woman_04.jpg": require("../../assets/profilepics/pexels_woman_04.jpg"),
  "pexels_woman_05.jpg": require("../../assets/profilepics/pexels_woman_05.jpg"),
  "pexels_woman_06.jpg": require("../../assets/profilepics/pexels_woman_06.jpg"),
  "pexels_woman_07.jpg": require("../../assets/profilepics/pexels_woman_07.jpg"),
  "pexels_woman_08.jpg": require("../../assets/profilepics/pexels_woman_08.jpg"),
  "pexels_woman_09.jpg": require("../../assets/profilepics/pexels_woman_09.jpg"),
  "pexels_woman_10.jpg": require("../../assets/profilepics/pexels_woman_10.jpg"),
  "pexels_woman_11.jpg": require("../../assets/profilepics/pexels_woman_11.jpg"),
  "pexels_woman_12.jpg": require("../../assets/profilepics/pexels_woman_12.jpg"),
  "pexels_woman_13.jpg": require("../../assets/profilepics/pexels_woman_13.jpg"),
  "pexels_woman_14.jpg": require("../../assets/profilepics/pexels_woman_14.jpg"),
  "pexels_woman_15.jpg": require("../../assets/profilepics/pexels_woman_15.jpg"),
  "pexels_woman_16.jpg": require("../../assets/profilepics/pexels_woman_16.jpg"),
  "pexels_woman_17.jpg": require("../../assets/profilepics/pexels_woman_17.jpg"),
  "pexels_woman_18.jpg": require("../../assets/profilepics/pexels_woman_18.jpg"),
  "pexels_woman_19.jpg": require("../../assets/profilepics/pexels_woman_19.jpg"),
  "pexels_woman_20.jpg": require("../../assets/profilepics/pexels_woman_20.jpg")
};

export const profileImageKeys = Object.keys(profileImages);

const fallback = profileImages["pexels-olly-948875.jpg"];

const isUri = (key: string) => key.startsWith("file://") || key.startsWith("content://") || key.startsWith("https://");

export const getProfileImage = (photoKey?: string): ImageSourcePropType => {
  if (photoKey) {
    if (profileImages[photoKey]) {
      return profileImages[photoKey];
    }
    if (isUri(photoKey)) {
      return { uri: photoKey };
    }
  }
  return fallback;
};

export const getProfileImages = (photoKeys?: string[]): ImageSourcePropType[] => {
  if (photoKeys && photoKeys.length > 0) {
    const results = photoKeys.map((key) => {
      if (profileImages[key]) return profileImages[key];
      if (isUri(key)) return { uri: key } as ImageSourcePropType;
      return null;
    }).filter((value): value is ImageSourcePropType => Boolean(value));
    if (results.length > 0) return results;
  }
  return [fallback];
};
