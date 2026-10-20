import { absolutePhotos, API_URL } from "../api";

describe("server photo paths", () => {
  it("puts the site in front of the server's own photo paths only", () => {
    const state = {
      wishes: [{ title: "/p/ is just text here", image: "/p/w/abc/1.jpg", images: ["/p/w/abc/1.jpg", "/api/img/w123/1", "https://shop.example/x.jpg"] }],
      me: { photo: "https://pub.r2.dev/u/1.jpg" },
    };
    const out = absolutePhotos(state);
    expect(out.wishes[0].image).toBe(API_URL + "/p/w/abc/1.jpg");
    expect(out.wishes[0].images).toEqual([API_URL + "/p/w/abc/1.jpg", API_URL + "/api/img/w123/1", "https://shop.example/x.jpg"]);
    expect(out.wishes[0].title).toBe("/p/ is just text here");
    expect(out.me.photo).toBe("https://pub.r2.dev/u/1.jpg");
  });
});

describe("photos sent back to the server", () => {
  it("lose the site again, so the server recognises its own photos", () => {
    const { relativePhotos } = require("../api");
    const body = { images: [API_URL + "/api/img/w1/0", API_URL + "/p/w/1.jpg", "https://shop.example/x.jpg", "data:image/jpeg;base64,AAA"] };
    expect(relativePhotos(body).images).toEqual(["/api/img/w1/0", "/p/w/1.jpg", "https://shop.example/x.jpg", "data:image/jpeg;base64,AAA"]);
  });
});
