import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAI from "openai";
import { env } from "~/env.mjs";
import { b64Image } from "~/data/b64Image";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
    credentials:{
        accessKeyId: env.ACCESS_KEY_ID,
        secretAccessKey: env.SECRET_ACCESS_KEY,
    },
    region: "us-east-1",
});

const openai = new OpenAI({
    apiKey: env.DALLE_API_KEY,
});

async function generateIcon(prompt: string): Promise<string | undefined> {
    if (env.MOCK_DALLE === "true"){
        return b64Image;
    } else {
        const response = await openai.images.generate({
            prompt,
            n: 1,
            size: "512x512",
            response_format: "b64_json",
          });
          //console.log("----");
          //console.log(response.data[0]?.b64_json);
          //console.log("----");
          return response.data[0]?.b64_json;
    }
}

export const generateRouter = createTRPCRouter({
    generateIcon: protectedProcedure.input(
        z.object({
            prompt: z.string(),
        })
    )
    .mutation(async({ctx, input}) => {
        const {count} = await ctx.prisma.user.updateMany({
            where: {
                id: ctx.session.user.id, 

                credits: {
                    gte: 1,
                },
            },
            data: {
                credits: {
                    decrement: 1,
                },
            },
        });

        if (count <= 0) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: "you do not have enough credits",
            });
        }
        
          const base64EncodedImage = await generateIcon(input.prompt);

          const icon = await ctx.prisma.icon.create({
            data: {
                prompt: input.prompt,
                userId: ctx.session.user.id,
            },
          });

          await s3.putObject({
            Bucket: "my-aws-icon-bucket",
            Body: Buffer.from(base64EncodedImage!, "base64"),
            Key: icon.id, 
            ContentEncoding: "base64",
            ContentType: "image/gif",
          }).promise();

        return {
            imageURL: base64EncodedImage,
        };
    }),
});
