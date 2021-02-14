import { PubSub } from "graphql-yoga";

const Subscription = {
  comment: {
    subscribe(parent, { postId }, { db, pubsub }, info) {
      const post = db.posts.find(
        (post) => post.id === postId && post.published
      );
      if (!post) {
        throw new Error("Post not Found");
      }
      return pubsub.asyncIterator(`comment ${postId}`);
    },
  },
};

export { Subscription as default };
