import { v4 as uuid4 } from "uuid";

const Mutation = {
  createUser(parent, args, { db }, info) {
    const emailTaken = db.users.find((x) => x.email === args.data.email);
    if (emailTaken) {
      throw new Error("Email Already registered");
    }

    const user = {
      id: uuid4(),
      ...args.data,
    };
    db.users.push(user);

    return user;
  },
  deleteUser(parent, args, { db }, info) {
    const userIndex = db.users.findIndex((user) => user.id === args.id);

    if (userIndex === -1) {
      throw new Error("User not found");
    }

    const deletedUsers = db.users.splice(userIndex, 1);

    db.posts = db.posts.filter((post) => {
      const match = post.author === args.id;

      if (match) {
        db.comments = db.comments.filter((comment) => comment.post !== post.id);
      }

      return !match;
    });
    db.comments = db.comments.filter((comment) => comment.author !== args.id);

    return deletedUsers[0];
  },
  updateUser(parent, { id, data }, { db }, info) {
    const user = db.users.find((x) => x.id === id);

    if (!user) {
      throw new Error("User Not Found");
    }

    const emailTaken = db.users.some((x) => x.email === data.email);
    if (emailTaken) {
      throw new Error("Email Taken");
    }
    user.email = data.email;
    user.name = data.name;

    if (typeof data.age !== undefined) {
      user.age = data.age;
    }

    return user;
  },
  createPost(parent, args, { db, pubsub }, info) {
    const userExists = db.users.some((x) => x.id === args.data.author);

    if (!userExists) {
      throw new Error("User Not found");
    }

    const newPost = {
      id: uuid4(),
      ...args.data,
    };

    db.posts.push(newPost);
    if (args.data.published) {
      pubsub.publish(`post`, {
        post: {
          mutation: "CREATED",
          data: newPost,
        },
      });
    }
    return newPost;
  },
  deletePost(parent, args, { db, pubsub }, info) {
    const postIndex = db.posts.findIndex((x) => x.id === args.id);

    if (postIndex === -1) {
      throw new Error("Invalid Post");
    }

    const [deletedPost] = db.posts.splice(postIndex, 1);

    db.comments = db.comments.filter((x) => x.post !== args.id);

    if (deletedPost.published) {
      pubsub.publish(`post`, {
        post: {
          mutation: "DELETED",
          data: deletedPost,
        },
      });
    }

    return deletedPost;
  },
  updatePost(parent, { id, data }, { db, pubsub }, info) {
    const post = db.posts.find((post) => post.id === id);
    const originalPost = { ...post };

    if (!post) {
      throw new Error("Post not found");
    }

    if (typeof data.title === "string") {
      post.title = data.title;
    }

    if (typeof data.body === "string") {
      post.body = data.body;
    }

    if (typeof data.published === "boolean") {
      post.published = data.published;

      if (originalPost.published && !post.published) {
        pubsub.publish("post", {
          post: {
            mutation: "DELETED",
            data: originalPost,
          },
        });
      } else if (!originalPost.published && post.published) {
        pubsub.publish("post", {
          post: {
            mutation: "CREATED",
            data: post,
          },
        });
      }
    } else if (post.published) {
      pubsub.publish("post", {
        post: {
          mutation: "UPDATED",
          data: post,
        },
      });
    }

    return post;
  },
  createComment(parent, args, { db, pubsub }, info) {
    const validComment =
      db.users.some((x) => x.id === args.data.author) &&
      db.posts.some((x) => x.id === args.data.post && x.published);

    if (!validComment) {
      throw new Error("Invalid Comment");
    }

    const newComment = {
      id: uuid4(),
      ...args.data,
    };

    db.comments.push(newComment);

    pubsub.publish(`comment ${args.data.post}`, {
      comment: {
        mutation: "CREATED",
        data: newComment,
      },
    });

    return newComment;
  },
  deleteComment(parent, args, { db, pubsub }, info) {
    const commentIndex = db.comments.findIndex((x) => x.id === args.id);

    if (commentIndex === -1) {
      throw new Error("Invalid Comment");
    }
    const [deletedComment] = db.comments.splice(commentIndex, 1);

    pubsub.publish(`comment ${deletedComment.post}`, {
      comment: {
        mutation: "DELETED",
        data: deletedComment,
      },
    });

    return deletedComment;
  },
  updateComment(parent, { id, data }, { db, pubsub }, info) {
    const comment = db.comments.find((x) => x.id === id);

    if (!comment) {
      throw new Error("Wrong Comment Id");
    }

    if (typeof data.text === "string") {
      comment.text = data.text;
    }
    pubsub.publish(`comment ${comment.post}`, {
      comment: {
        mutation: "UPDATED",
        data: comment,
      },
    });

    return comment;
  },
};

export { Mutation as default };
